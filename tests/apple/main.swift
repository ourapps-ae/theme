import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("FAIL: \(message)\n".utf8))
    exit(1)
}
func check(_ condition: Bool, _ message: @autoclosure () -> String) { if !condition { fail(message()) } }
func near(_ a: Double, _ b: Double, _ what: String) { check(abs(a - b) < 1e-6 * max(1, abs(b)) + 1e-9, "\(what): \(a) vs \(b)") }

func json(_ path: String) -> [String: Any] {
    guard let data = FileManager.default.contents(atPath: path), let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { fail("cannot read \(path)") }
    return value
}

// Every generated theme matches themes.json.
let accentCheck = ThemeSet.named("night").resolved(primary: "hex e0b35a")
check(accentCheck.accent == ThemeColour(hex: "#e0b35a")!, "accent follows the primary colour")
let file = json("implementation/web/themes.json")
let themes = file["themes"] as! [[String: Any]]
check(ThemeTokens.all.count == themes.count, "theme count")
check(ThemeTokens.defaultName == file["default"] as! String, "default name")
var colourChecks = 0
for t in themes {
    let name = t["name"] as! String
    guard let set = ThemeTokens.all[name] else { fail("missing theme \(name)") }
    let colours = t["colour"] as! [String: String]
    let mine: [String: ThemeColour] = [
        "background": set.colour.background, "surface": set.colour.surface, "edge": set.colour.edge, "primary": set.colour.primary,
        "onPrimary": set.colour.onPrimary, "table": set.colour.table, "tableEdge": set.colour.tableEdge, "text": set.colour.text,
        "muted": set.colour.muted, "danger": set.colour.danger, "good": set.colour.good, "warning": set.colour.warning,
        "paper": set.colour.paper, "paperAccent": set.colour.paperAccent,
    ]
    check(mine.count == colours.count, "colour names in \(name)")
    for (key, hex) in colours {
        guard let expected = ThemeColour(hex: hex), let actual = mine[key] else { fail("colour \(name).\(key)") }
        check(expected == actual, "\(name).\(key) \(hex)")
        colourChecks += 1
    }
    let spacing = t["spacing"] as! [String: Double]
    near(set.spacing.md, spacing["md"]!, "spacing.md")
    near(set.radii.pill, (t["radii"] as! [String: Double])["pill"]!, "radii.pill")
    let background = t["background"] as! [String: Any]
    check(set.background.glowFromTop == background["glowFromTop"] as! Bool, "glowFromTop")
    check(set.background.specks == background["specks"] as! Int, "specks")
    check(set.background.glyphs == background["glyphs"] as! String, "glyphs")
}

// Overrides: valid replace, malformed and empty are ignored, unknown names fall back to the default.
let base = ThemeSet.named("night")
let changed = base.resolved(primary: "#112233", table: "#445566aa")
check(changed.colour.primary == ThemeColour(rgba: 0x112233FF), "primary override")
check(changed.colour.table == ThemeColour(rgba: 0x445566AA), "table override")
check(base.resolved(primary: "gold", table: "").colour == base.colour, "malformed overrides ignored")
check(ThemeSet.named("nope").name == ThemeTokens.defaultName, "unknown name falls back")
check(ThemeColour.setting("hex 1D4D3A") == ThemeColour(rgba: 0x1D4D3AFF) && ThemeColour.setting("hex 112233aa") == ThemeColour(rgba: 0x112233AA) && ThemeColour.setting("#aabbcc") == ThemeColour(rgba: 0xAABBCCFF) && ThemeColour.setting("aabbcc") == ThemeColour(rgba: 0xAABBCCFF), "installer colour forms")
for bad in ["gold", "hex 12345", "hex", "#12345g", "hex #", "hex aabbccd", "hexaabbcc"] { check(ThemeColour.setting(bad) == nil, "refused \(bad)") }
check(base.resolved(primary: "hex 112233").colour.primary == ThemeColour(rgba: 0x112233FF), "hex override")
check(ThemeColour(hex: "#12345") == nil && ThemeColour(hex: "123456") == nil, "colour grammar")

// Background maths against the frames the TypeScript produced.
let fixtures = json("tests/fixtures/background.json")
var frames = 0
for c in fixtures["glyphCases"] as! [[String: Any]] {
    let style = ThemeTokens.all[c["theme"] as! String]!.background
    let p = c["particle"] as! [String: Double]
    let particle = GlyphParticle(x: p["x"]!, y: p["y"]!, period: p["period"]!, phase: p["phase"]!, spin: p["spin"]!, sway: p["sway"]!, glyphIndex: Int(p["sprite"]!))
    let t = c["t"] as! Double
    let got = BackgroundMath.glyphFrame(particle, style: style, t: t * style.speed, light: c["light"] as! Double, width: c["width"] as! Double, height: c["height"] as! Double)
    if let e = c["expected"] as? [String: Double] {
        guard let got else { fail("glyph frame missing at t=\(t)") }
        near(got.x, e["x"]!, "x"); near(got.y, e["y"]!, "y"); near(got.size, e["size"]!, "size")
        near(got.alpha, e["alpha"]!, "alpha"); near(got.rotationDegrees, e["rotation"]!, "rotation")
    } else {
        check(got == nil, "glyph frame should be hidden at t=\(t)")
    }
    frames += 1
}
for c in fixtures["speckCases"] as! [[String: Any]] {
    let style = ThemeTokens.all[c["theme"] as! String]!.background
    let s = c["speck"] as! [String: Double]
    let got = BackgroundMath.speckFrame(Speck(x: s["x"]!, phase: s["phase"]!, period: s["period"]!, size: s["size"]!, wobble: s["wobble"]!), style: style, t: c["t"] as! Double, width: c["width"] as! Double, height: c["height"] as! Double)
    let e = c["expected"] as! [String: Double]
    near(got.x, e["x"]!, "speck x"); near(got.y, e["y"]!, "speck y"); near(got.radius, e["radius"]!, "radius"); near(got.alpha, e["alpha"]!, "speck alpha")
    frames += 1
}

// The seeded particles are the same on every run and stay inside their ranges.
check(BackgroundMath.particles.count == 14 && BackgroundMath.specks.count == 120, "particle counts")
for p in BackgroundMath.particles { check(p.glyphIndex >= 0 && p.glyphIndex < 4 && p.x >= -0.8 && p.x <= 0.8 && p.period >= 14 && p.period <= 26, "particle range") }
check(GlyphParticle(seed: 3).x == BackgroundMath.particles[3].x, "particles are deterministic")

print("\(colourChecks) colour, \(frames) frame assertions passed")
