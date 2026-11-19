import { describe, it, expect } from "vitest";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { buildCapXml } from "./cap.js";

// The real OASIS CAP 1.2 XSD was downloaded to pipeline/cap-v1.2.xsd
// (docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.xsd) but this
// environment has no xmllint or other XSD validator available, so full
// schema validation was not run. Logged in DECISIONS.md. Well-formedness
// is checked here instead, with XMLValidator.validate, which is stricter
// than XMLParser.parse alone.

describe("buildCapXml", () => {
  const input = {
    id: "highwater-test-001",
    sentIso: "2026-11-19T12:00:00+00:00",
    facilityName: "Lokoja Primary Health Center",
    state: "Kogi",
    lga: "Lokoja",
    lat: 7.8,
    lon: 6.74,
    level: "WARNING" as const,
    headline: "River forecast above flood warning level near Lokoja Primary Health Center",
    description: "Test description.",
    effectiveIso: "2026-11-19T12:00:00+00:00",
    expiresIso: "2026-11-26T12:00:00+00:00",
  };

  it("produces well-formed XML that a parser can read back", () => {
    const xml = buildCapXml(input);
    expect(XMLValidator.validate(xml)).toBe(true);
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    expect(parsed.alert.identifier).toBe("highwater-test-001");
    expect(parsed.alert.info.severity).toBe("Severe");
    expect(parsed.alert["@_xmlns"]).toBe("urn:oasis:names:tc:emergency:cap:1.2");
  });

  it("includes the CAP 1.2 namespace", () => {
    const xml = buildCapXml(input);
    expect(xml).toContain("urn:oasis:names:tc:emergency:cap:1.2");
  });
});
