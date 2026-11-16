import Foundation

let file = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [String: Any]
let themes = file["themes"] as! [[String: Any]]
let defaultName = file["default"] as! String

func checkColour(_ colour: ThemeColour, _ hex: String) {
    let digits = String(hex.dropFirst()) + (hex.count == 7 ? "ff" : "")
    let value = UInt32(digits, radix: 16)!
    let channels = [colour.red, colour.green, colour.blue, colour.alpha]
    for (index, shift) in [24, 16, 8, 0].enumerated() {
        precondition(abs(channels[index] - Double((value >> shift) & 255) / 255) < 1e-12)
    }
}

for theme in themes {
    let name = theme["name"] as! String
    let native = ThemeSet.named(name)
    precondition(native.name == name)
    let colours = theme["colour"] as! [String: String]
    let values: [String: ThemeColour] = [
        "background": native.colour.background, "surface": native.colour.surface, "edge": native.colour.edge,
        "primary": native.colour.primary, "onPrimary": native.colour.onPrimary, "table": native.colour.table,
        "tableEdge": native.colour.tableEdge, "text": native.colour.text, "muted": native.colour.muted,
        "danger": native.colour.danger, "good": native.colour.good, "warning": native.colour.warning,
        "paper": native.colour.paper, "paperAccent": native.colour.paperAccent,
    ]
    for (key, value) in values { checkColour(value, colours[key]!) }
    let spacing = theme["spacing"] as! [String: Double]
    precondition(native.spacing.md == spacing["md"]!)
    let changed = native.resolved(primary: "hex 123456", table: "hex ABCDEF")
    checkColour(changed.colour.primary, "#123456")
    checkColour(changed.colour.table, "#abcdef")
    checkColour(native.colour.primary, colours["primary"]!)
    checkColour(native.resolved(primary: "invalid").colour.primary, colours["primary"]!)
}
precondition(ThemeSet.named("missing-theme").name == defaultName)
precondition(ThemeSet.named(nil).name == defaultName)
precondition(ThemeColour.setting("invalid") == nil)
print("shared Swift theme values, fallback and overrides passed")
