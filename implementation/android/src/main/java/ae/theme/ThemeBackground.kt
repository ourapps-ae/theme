package ae.theme

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize

fun ThemeSet.composeColours() = ComposeColours(this)

// The theme's colours as Compose Colors.
class ComposeColours(theme: ThemeSet) {
    val background = Color(theme.colour.background)
    val surface = Color(theme.colour.surface)
    val edge = Color(theme.colour.edge)
    val primary = Color(theme.colour.primary)
    val onPrimary = Color(theme.colour.onPrimary)
    val table = Color(theme.colour.table)
    val tableEdge = Color(theme.colour.tableEdge)
    val text = Color(theme.colour.text)
    val muted = Color(theme.colour.muted)
    val danger = Color(theme.colour.danger)
    val good = Color(theme.colour.good)
    val warning = Color(theme.colour.warning)
    val paper = Color(theme.colour.paper)
    val paperAccent = Color(theme.colour.paperAccent)
}

// A figure in front of the animation, in a corner of the screen: "tl", "bl" or "br".
class SceneFront(val at: String, val h: Float, val maxW: Float, val flipX: Boolean = false, val flipY: Boolean = false)

// Pictures behind and in front of the animation, loaded by the application from its own resources.
// anchor 0 shows the top of a picture taller than the screen, 1 the bottom.
class BackgroundScene(val back: ImageBitmap? = null, val front: ImageBitmap? = null, val anchor: Float = 0.5f, val fronts: List<SceneFront> = emptyList())

private fun DrawScope.drawCover(img: ImageBitmap, anchor: Float) {
    val k = maxOf(size.width / img.width, size.height / img.height)
    val w = img.width * k
    val h = img.height * k
    drawImage(img, dstOffset = IntOffset(((size.width - w) / 2).toInt(), ((size.height - h) * anchor).toInt()), dstSize = IntSize(w.toInt(), h.toInt()))
}

private fun DrawScope.drawFigure(img: ImageBitmap, f: SceneFront) {
    val k = minOf(f.h * size.height / img.height, f.maxW * size.width / img.width)
    val w = img.width * k
    val h = img.height * k
    val x = if (f.at == "br") size.width - w else 0f
    val y = if (f.at == "tl") 0f else size.height - h
    scale(if (f.flipX) -1f else 1f, if (f.flipY) -1f else 1f, pivot = Offset(x + w / 2, y + h / 2)) {
        drawImage(img, dstOffset = IntOffset(x.toInt(), y.toInt()), dstSize = IntSize(w.toInt(), h.toInt()))
    }
}

// Figures are for the screens away from play; a table shows only the picture behind.
@Composable
fun ThemeBackground(theme: ThemeSet = ThemeSet.named(null), scene: BackgroundScene = BackgroundScene(), figures: Boolean = true, modifier: Modifier = Modifier) {
    val style = theme.background
    val paint = remember(theme.name, style.tint) { Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color(style.tint).toArgb(); textAlign = Paint.Align.CENTER } }
    var t by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(Unit) {
        val start = withFrameNanos { it }
        while (true) withFrameNanos { now -> t = (now - start) / 1_000_000_000f }
    }
    Canvas(modifier.fillMaxSize()) {
        drawRect(Color(theme.colour.background))
        scene.back?.let { drawCover(it, scene.anchor) }
        val light = BackgroundMath.flicker(style, t)
        for (p in BackgroundMath.particles) {
            val f = BackgroundMath.glyphFrame(p, style, t * style.speed, light, size.width, size.height) ?: continue
            if (style.glyphs.isEmpty()) break
            paint.alpha = (f.alpha * 255).toInt()
            paint.textSize = f.size * 0.9f
            val glyph = style.glyphs[p.glyphIndex % style.glyphs.length].toString()
            rotate(f.rotationDegrees, pivot = Offset(f.x, f.y)) {
                drawIntoCanvas { it.nativeCanvas.drawText(glyph, f.x, f.y + f.size * 0.32f, paint) }
            }
        }
        for (sp in BackgroundMath.specks.take(style.specks)) {
            val s = BackgroundMath.speckFrame(sp, style, t, size.width, size.height)
            drawCircle(Color(style.speckColour).copy(alpha = s.alpha), radius = s.radius, center = Offset(s.x, s.y))
        }
        val glow = Color(style.glow)
        val centre = if (style.glowFromTop) Offset(size.width * 0.5f, -size.height * 0.1f) else Offset(size.width * 0.5f, size.height * 1.05f)
        drawRect(Brush.radialGradient(listOf(glow.copy(alpha = 0.22f * light), glow.copy(alpha = 0.08f * light), Color.Transparent), center = centre, radius = size.height * 0.9f))
        drawRect(Brush.radialGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.75f)), center = center, radius = size.maxDimension * 0.75f))
        if (figures) scene.front?.let { img -> for (f in scene.fronts) drawFigure(img, f) }
    }
}
