import ae.theme.*
import java.io.File

// Mirrors tests/apple/main.swift without a JSON library: token values are checked against the
// generated constants, and the background maths against hand-checked properties.
fun check(condition: Boolean, message: String) { if (!condition) { System.err.println("FAIL: $message"); System.exit(1) } }

fun main() {
    check(ThemeTokens.ALL.keys == setOf("night", "lounge"), "theme names")
    check(ThemeTokens.DEFAULT_NAME == "night", "default name")
    val themes = File("implementation/web/themes.json").readText()
    for ((name, set) in ThemeTokens.ALL) {
        for (hex in listOf(set.colour.primary, set.colour.table, set.colour.background)) {
            val digits = "%08X".format(hex)
            check(themes.contains(digits.substring(2).lowercase()), "$name colour $digits is in themes.json")
        }
    }
    val night = ThemeSet.named("night")
    val changed = night.resolved(primary = "#112233", table = "#445566aa")
    check(changed.colour.primary == 0xFF112233L && changed.colour.table == 0xAA445566L, "overrides")
    check(night.resolved(primary = "gold", table = "").colour == night.colour, "malformed overrides ignored")
    check(ThemeSet.named("nope").name == "night", "unknown name falls back")
    val palette = changed.palette()
    check(palette.primary == 0xFF112233L && palette.secondary == 0xAA445566L && palette.background == night.colour.background && palette.onPrimary == night.colour.onPrimary, "palette")
    check(parseColourSetting("hex 1D4D3A") == 0xFF1D4D3AL && parseColourSetting("hex 112233aa") == 0xAA112233L && parseColourSetting("aabbcc") == 0xFFAABBCCL, "installer colour forms")
    check(listOf("gold", "hex 12345", "hex", "#12345g", "hex #", "hex aabbccd", "hexaabbcc").all { parseColourSetting(it) == null }, "bad installer colours")
    check(parseColour("#12345") == null && parseColour("123456") == null, "colour grammar")
    val style = night.background
    val p = GlyphParticle(0.31f, -0.22f, 18f, 0.1f, 9f, 1.2f, 2)
    val frame = BackgroundMath.glyphFrame(p, style, 3.5f, BackgroundMath.flicker(style, 3.5f), 390f, 844f)
    check(frame == null || (frame.alpha in 0.01f..1f && frame.size > 0f), "glyph frame range")
    check(BackgroundMath.particles.size == 14 && BackgroundMath.specks.size == 120, "particle counts")
    println("android theme checks passed")
}
