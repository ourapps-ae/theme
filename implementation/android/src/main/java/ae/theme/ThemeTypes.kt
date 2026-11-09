package ae.theme

// The token shapes ThemeTokens.kt (generated from themes.json) fills in. Colours are 0xAARRGGBB
// Longs, so the values can be read and tested without Compose; ThemeBackground.kt turns them into Colors.
data class ThemeColours(
    val background: Long, val surface: Long, val edge: Long, val primary: Long, val onPrimary: Long, val table: Long, val tableEdge: Long,
    val text: Long, val muted: Long, val danger: Long, val good: Long, val warning: Long, val paper: Long, val paperAccent: Long,
)

data class ThemeSpacing(val xs: Float, val sm: Float, val md: Float, val lg: Float, val xl: Float)
data class ThemeRadii(val sm: Float, val md: Float, val lg: Float, val pill: Float)
data class ThemeType(val family: String, val caption: Float, val small: Float, val body: Float, val subtitle: Float, val title: Float, val display: Float)

data class ThemeBackgroundStyle(
    val tint: Long, val glow: Long, val glowFromTop: Boolean, val speed: Float, val suitAlpha: Float, val specks: Int,
    val speckUp: Boolean, val speckColour: Long, val glyphs: String,
)

data class ThemePalette(val primary: Long, val secondary: Long, val background: Long, val surface: Long, val onPrimary: Long)

data class ThemeSet(
    val name: String,
    val colour: ThemeColours,
    val spacing: ThemeSpacing,
    val radii: ThemeRadii,
    val type: ThemeType,
    val background: ThemeBackgroundStyle,
) {
    // The installer's colour overrides (see parseColourSetting); an empty or malformed value is ignored.
    fun resolved(primary: String? = null, table: String? = null): ThemeSet {
        val p = primary?.let(::parseColourSetting)
        val t = table?.let(::parseColourSetting)
        return copy(colour = colour.copy(primary = p ?: colour.primary, table = t ?: colour.table))
    }

    // The five colours android-host's ShellPalette takes; the theme has no secondary colour, so the table colour stands in.
    fun palette(): ThemePalette = ThemePalette(colour.primary, colour.table, colour.background, colour.surface, colour.onPrimary)

    companion object {
        // The named theme, the default when the name is unknown or null.
        fun named(name: String?): ThemeSet = ThemeTokens.ALL[name] ?: ThemeTokens.ALL.getValue(ThemeTokens.DEFAULT_NAME)
    }
}

// An installer colour: "hex e0b35a" (an aepm string setting cannot hold "#" and starts with a
// letter), "#rrggbb", "rrggbb", each optionally with two more digits of opacity; null for anything else.
fun parseColourSetting(value: String): Long? {
    var text = value.trim()
    if (text.startsWith("hex", ignoreCase = true)) {
        val rest = text.substring(3)
        if (rest.isEmpty() || !rest[0].isWhitespace()) return null
        text = rest.trim()
    }
    return parseColour("#" + text.removePrefix("#"))
}

// "#rrggbb" (opaque) or "#rrggbbaa" to 0xAARRGGBB; null for anything else.
fun parseColour(hex: String): Long? {
    if (!hex.startsWith("#") || (hex.length != 7 && hex.length != 9)) return null
    val digits = hex.substring(1)
    if (!digits.all { it in '0'..'9' || it in 'a'..'f' || it in 'A'..'F' }) return null
    val rgb = digits.substring(0, 6).toLong(16)
    val alpha = if (digits.length == 8) digits.substring(6, 8).toLong(16) else 0xFFL
    return (alpha shl 24) or rgb
}
