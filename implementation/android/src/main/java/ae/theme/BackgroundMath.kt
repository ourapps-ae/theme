package ae.theme

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

// The placement maths of the animated background: glyphs drifting toward the viewer, and specks.
// Matches web/background.ts glyphFrame and speckFrame.
class GlyphParticle(val x: Float, val y: Float, val period: Float, val phase: Float, val spin: Float, val sway: Float, val glyphIndex: Int) {
    companion object {
        fun seeded(seed: Int, glyphCount: Int = 4): GlyphParticle {
            val r = java.util.Random(seed.toLong())
            return GlyphParticle(
                x = r.nextFloat() * 1.6f - 0.8f, y = r.nextFloat() * 1.4f - 0.7f, period = 14f + r.nextFloat() * 12f, phase = r.nextFloat(),
                spin = (r.nextFloat() - 0.5f) * 30f, sway = r.nextFloat() * 2f * PI.toFloat(), glyphIndex = r.nextInt(glyphCount),
            )
        }
    }
}

class Speck(val x: Float, val phase: Float, val period: Float, val size: Float, val wobble: Float) {
    companion object {
        fun seeded(seed: Int): Speck {
            val r = java.util.Random(seed.toLong() * 31 + 7)
            return Speck(r.nextFloat(), r.nextFloat(), 18f + r.nextFloat() * 20f, 1.5f + r.nextFloat() * 2.5f, r.nextFloat() * 2f * PI.toFloat())
        }
    }
}

data class GlyphFrame(val x: Float, val y: Float, val size: Float, val alpha: Float, val rotationDegrees: Float)
data class SpeckFrame(val x: Float, val y: Float, val radius: Float, val alpha: Float)

object BackgroundMath {
    val particles: List<GlyphParticle> = List(14) { GlyphParticle.seeded(it * 7919 + 13) }
    val specks: List<Speck> = List(120) { Speck.seeded(it) }

    fun flicker(style: ThemeBackgroundStyle, t: Float): Float =
        if (style.glowFromTop) 0.75f + 0.1f * sin(t * 0.7f) else 0.6f + 0.2f * sin(t * 1.3f) * sin(t * 0.7f)

    // `t` is already multiplied by the style's speed. null when off screen or too faint.
    fun glyphFrame(p: GlyphParticle, style: ThemeBackgroundStyle, t: Float, light: Float, width: Float, height: Float): GlyphFrame? {
        val z = 1f - ((t / p.period + p.phase) % 1f)
        val depth = 0.08f + z * 0.92f
        val scale = 0.1f / depth
        val x = width * (0.5f + p.x / depth * 0.5f + 0.02f * sin(t * 0.6f + p.sway))
        val y = height * (0.5f + p.y / depth * 0.5f + 0.015f * sin(t * 0.8f + p.sway * 2f))
        val size = width * scale
        if (x < -size || x > width + size || y < -size || y > height + size) return null
        val alpha = style.suitAlpha * ((1f - z) * 4f).coerceIn(0f, 1f) * (z * 5f).coerceIn(0f, 1f) * (0.6f + 0.4f * light.coerceAtMost(1.2f)) * (1f - depth * 0.5f)
        if (alpha <= 0.01f) return null
        return GlyphFrame(x, y, size, alpha, p.spin * (1f - z))
    }

    fun speckFrame(sp: Speck, style: ThemeBackgroundStyle, t: Float, width: Float, height: Float): SpeckFrame {
        val f = (t / sp.period + sp.phase) % 1f
        val y = if (style.speckUp) 1f - f else f
        val x = sp.x + 0.02f * sin(t * 0.5f + sp.wobble)
        val a = (0.25f + 0.2f * sin(t * 1.3f + sp.wobble)) * (1f - abs(y - 0.5f) * 1.2f).coerceIn(0f, 1f)
        return SpeckFrame(x * width, y * height, sp.size, a)
    }
}
