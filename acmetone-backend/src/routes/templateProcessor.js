const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { CoverTemplate } = require('../models');
const { auth } = require('../middleware/auth');
const StackBlur = require('stackblur-canvas');

const UPLOADS_TEMP_DIR = path.join(__dirname, '../../uploads/temp');
const FONTS_DIR = path.join(__dirname, '../../fonts');

// A structured map of all available fonts, defining their family, weight, and file path.
const FONT_MAP = [
    // Aemstel Family
    { family: 'Aemstel', weight: '400', style: 'normal', file: 'Aemstel/Aemstel-Regular.ttf' },
    { family: 'Aemstel LineHorizontal', weight: '400', style: 'normal', file: 'Aemstel/Aemstel-LineHorizontal.ttf' },
    { family: 'Aemstel LineInside', weight: '400', style: 'normal', file: 'Aemstel/Aemstel-LineInside.ttf' },
    { family: 'Aemstel LineOutside', weight: '400', style: 'normal', file: 'Aemstel/Aemstel-LineOutside.ttf' },
    { family: 'Aemstel Shadow', weight: '400', style: 'normal', file: 'Aemstel/Aemstel-Shadow.ttf' },
    // AiDeep Family
    { family: 'AiDeep', weight: '400', style: 'normal', file: 'AiDeep/AiDeep-2.otf' },
    // Coliner Family
    { family: 'Coliner', weight: '300', style: 'normal', file: 'Coliner/Coliner-Light-BF677cd35b9f4b5.ttf' },
    { family: 'Coliner', weight: '400', style: 'normal', file: 'Coliner/Coliner-Regular-BF677cd35b900ac.ttf' },
    { family: 'Coliner', weight: '500', style: 'normal', file: 'Coliner/Coliner-Medium-BF677cd35ba256e.ttf' },
    { family: 'Coliner', weight: '600', style: 'normal', file: 'Coliner/Coliner-SemiBold-BF677cd35ba64a5.ttf' },
    { family: 'Coliner', weight: '700', style: 'normal', file: 'Coliner/Coliner-Bold-BF677cd35b9aaa0.ttf' },
    { family: 'Coliner', weight: '800', style: 'normal', file: 'Coliner/Coliner-ExtraBold-BF677cd35ba3c8d.ttf' },
    // HarmonyOS Sans SC Family
    { family: 'HarmonyOS Sans SC', weight: '100', style: 'normal', file: 'HarmonyOs/HarmonyOS_Sans_SC_Thin.ttf' },
    { family: 'HarmonyOS Sans SC', weight: '300', style: 'normal', file: 'HarmonyOs/HarmonyOS_Sans_SC_Light.ttf' },
    { family: 'HarmonyOS Sans SC', weight: '500', style: 'normal', file: 'HarmonyOs/HarmonyOS_SansSC_Medium.ttf' },
    { family: 'HarmonyOS Sans SC', weight: '700', style: 'normal', file: 'HarmonyOs/HarmonyOS_Sans_SC_Bold.ttf' },
    { family: 'HarmonyOS Sans SC', weight: '900', style: 'normal', file: 'HarmonyOs/HarmonyOS_Sans_SC_Black.ttf' },
    // Other Custom Fonts
    { family: 'Monoline', weight: '400', style: 'normal', file: 'Monoline/monoline.otf' },
    { family: 'Roline', weight: '400', style: 'normal', file: 'Roline/roline.otf' },
    { family: 'Serenity', weight: '400', style: 'normal', file: 'serenity/Serenity-Regular-BF6849992b088d0.otf' }
];

// --- Register all fonts on startup ---
try {
  FONT_MAP.forEach(font => {
    const fontPath = path.join(FONTS_DIR, font.file);
    if (fs.existsSync(fontPath)) {
      registerFont(fontPath, { family: font.family, weight: font.weight, style: font.style });
      console.log(`[Canvas] Registered font: ${font.file} as family '${font.family}' with weight ${font.weight}`);
    } else {
      console.warn(`[Canvas] Font file not found, skipping registration: ${font.file}`);
    }
  });
} catch (error) {
    console.error(`[Canvas] Error registering fonts:`, error);
}

// --- Helper: Calculate Layer Position ---
const calculateBasePosition = (layer, imageSize) => {
    let baseX = imageSize / 2;
    if ((layer.gravity || 'center').includes('west')) baseX = 0;
    if ((layer.gravity || 'center').includes('east')) baseX = imageSize;
    let baseY = imageSize / 2;
    if ((layer.gravity || 'center').includes('north')) baseY = 0;
    if ((layer.gravity || 'center').includes('south')) baseY = imageSize;
    // Return intermediate values for logging
    return { finalX: baseX + (layer.offsetX || 0), finalY: baseY + (layer.offsetY || 0), baseX, baseY };
};

const calculateRectTopLeft = (finalX, finalY, layer) => {
    let rectX = finalX;
    let rectY = finalY;
    if ((layer.gravity || 'center').includes('east')) rectX -= layer.width;
    else if (!(layer.gravity || 'center').includes('west')) rectX -= layer.width / 2;
    if ((layer.gravity || 'center').includes('south')) rectY -= layer.height;
    else if (!(layer.gravity || 'center').includes('north')) rectY -= layer.height / 2;
    return { rectX, rectY };
};

const getLayerBounds = (layer, imageSize, textContent) => {
    const { finalX, finalY } = calculateBasePosition(layer, imageSize);

    if (layer.type === 'rectangle' || layer.type === 'effect-area') {
      const { rectX, rectY } = calculateRectTopLeft(finalX, finalY, layer);
      return { x: rectX, y: rectY, width: layer.width, height: layer.height };
    }
    
    if (layer.type === 'text') {
        const currentText = textContent || '';
        const lines = layer.orientation === 'vertical' ? currentText.split('') : currentText.split('\\n');
        const fontSize = layer.fontSize || 80;
        const lineHeight = (layer.lineHeight || 1.2) * fontSize;
        const approximateHeight = lines.length * lineHeight;
        
        let approximateWidth = 0;
        if (layer.orientation === 'vertical') {
            approximateWidth = fontSize; // Approximation for vertical layout
        } else {
            // Approximation for horizontal layout
            const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
            approximateWidth = maxLineLength * fontSize * 0.6; // Rough estimate
        }

        return {
            x: finalX - approximateWidth / 2,
            y: finalY - approximateHeight / 2,
            width: approximateWidth,
            height: approximateHeight
        };
    }
    return null;
};

// --- Helper: Draw text with letter spacing ---
const fillTextWithSpacing = (ctx, text, x, y, spacing) => {
    if (!spacing || spacing === 0) {
        ctx.fillText(text, x, y);
        return;
    }

    // Get the total width of the text with spacing
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
        totalWidth += ctx.measureText(text[i]).width;
        if (i < text.length - 1) {
            totalWidth += spacing;
        }
    }
    
    let currentX;
    // Adjust starting X based on text alignment
    if (ctx.textAlign === 'center') {
        currentX = x - totalWidth / 2;
    } else if (ctx.textAlign === 'right') {
        currentX = x - totalWidth;
    } else { // 'left' or default
        currentX = x;
    }

    // Draw each character with the specified spacing
    for (const char of text) {
        ctx.fillText(char, currentX, y);
        currentX += ctx.measureText(char).width + spacing;
    }
};

router.post('/apply-template', auth, async (req, res) => {
  const { imageBase64, imageUrl, templateId, definition: templateDefinition, data } = req.body;
  const IMAGE_SIZE = 3000;

  if ((!imageBase64 && !imageUrl) || (!templateId && !templateDefinition) || !data) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    let definition;
    if (templateId) {
        const template = await CoverTemplate.findByPk(templateId);
        if (!template) return res.status(404).json({ message: 'Template not found' });
        definition = template.definition;
    } else {
        definition = templateDefinition;
    }

    if (!definition || !Array.isArray(definition.layers)) {
        return res.status(400).json({ message: 'Invalid template definition provided.' });
    }

    // --- Main Canvas ---
    const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const ctx = canvas.getContext('2d');

    // Step 1: Draw background image to main canvas
    const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const backgroundImage = await loadImage(imageBuffer);
    ctx.drawImage(backgroundImage, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

    // Step 2: Process layers from bottom to top (by reversing the array)
    for (const layer of [...definition.layers].reverse()) {
        if (!layer.visible) {
            console.log(`[DEBUG] Skipping non-visible layer ID: ${layer.id || 'N/A'}`);
            continue;
        }

        console.log(`\n[DEBUG] --- Processing Layer: ${layer.id || 'N/A'} (Type: ${layer.type}) ---`);
        console.log(`[DEBUG]   - Opacity: ${layer.opacity}, Blend Mode: ${layer.blendMode}`);
        console.log(`[DEBUG]   - Rotation: ${layer.rotation}, Origin: ${JSON.stringify(layer.rotationOrigin)}`);

        ctx.save();

        // Apply opacity and blend mode
        const blendMode = layer.blendMode || 'source-over';
        ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
        ctx.globalCompositeOperation = blendMode;
        console.log(`[DEBUG]   - Applying Opacity: ${ctx.globalAlpha}, Blend Mode: ${blendMode}`);
        
        const textContent = (layer.type === 'text' && data) ? (data[layer.placeholder] || layer.text || '') : '';

        // --- Calculate final position ---
        const { finalX, finalY } = calculateBasePosition(layer, IMAGE_SIZE);

        // --- Apply rotation ---
        // This is now done before drawing the object itself.
        // We translate to the object's anchor point, rotate, then translate back.
        if (layer.rotation) {
            ctx.translate(finalX, finalY);
            ctx.rotate(layer.rotation * Math.PI / 180);
            ctx.translate(-finalX, -finalY);
        }

        // --- Get Text Content ---
        let textToDraw = '';
        if (layer.type === 'text') {
            textToDraw = (data && data[layer.placeholder]) ? (data[layer.placeholder] || layer.text || '') : (layer.text || '');
            
            // Apply split index logic first
            if (textToDraw && layer.splitIndex && layer.splitIndex !== 0) {
                const parts = textToDraw.split(' ').filter(p => p.trim() !== '');
                const index = parseInt(layer.splitIndex, 10);
                let targetPart = null;
                if (index > 0 && index <= parts.length) {
                    targetPart = parts[index - 1];
                } else if (index < 0 && Math.abs(index) <= parts.length) {
                    targetPart = parts[parts.length + index];
                }

                if (targetPart === null) {
                    const placeholderName = layer.placeholder || '文本';
                    throw new Error(`模板应用失败：图层"${layer.name}"中的占位符"${placeholderName}"只有 ${parts.length} 个分词，无法选择第 ${layer.splitIndex} 个。`);
                }
                textToDraw = targetPart;
            }

            // Apply text transform after getting the final content
            if (layer.textTransform === 'uppercase') {
                textToDraw = textToDraw.toUpperCase();
            }
        }

        // --- Draw Layer Content ---
        if (layer.type === 'text') {
            if (textToDraw) {
                ctx.fillStyle = layer.color || '#FFFFFF';
                const fontFamily = layer.fontFamily || 'Arial';
                const fontWeight = layer.fontWeight || 'normal';
                const fontString = `${fontWeight} ${layer.fontSize || 80}px "${fontFamily}"`;
                ctx.font = fontString;
                ctx.textAlign = layer.textAlign || 'center';
                ctx.textBaseline = 'middle';
                const letterSpacing = layer.letterSpacing || 0;

                const lines = textToDraw.split('\\n');
                const lineHeight = (layer.lineHeight || 1.2) * (layer.fontSize || 80);
                const totalHeight = lines.length * lineHeight;
                
                // Adjust for multiline text alignment
                let startY = finalY - (totalHeight / 2) + (lineHeight / 2);
                
                lines.forEach((line, index) => {
                    fillTextWithSpacing(ctx, line, finalX, startY + (index * lineHeight), letterSpacing);
                });
            }
        } else if (layer.type === 'shape' && layer.shapeType === 'rectangle') {
            ctx.fillStyle = layer.color || '#FFFFFF';
            // Since rotation is around finalX/finalY (the anchor), we draw the rect relative to that anchor.
            // The anchor is the center, so we offset by -width/2 and -height/2.
            ctx.fillRect(finalX - layer.width / 2, finalY - layer.height / 2, layer.width, layer.height);
        
        } else if (layer.type === 'effect-area') {
            // NOTE: Rotating an effect area is complex as it involves rotating the pixel source.
            // For now, we apply the effect without rotation. A more advanced implementation might use a temporary canvas.
            // We still need to calculate the bounds for the effect.
            const { rectX, rectY } = calculateRectTopLeft(finalX, finalY, layer);
             if (layer.effect === 'gaussian-blur' && layer.radius > 0) {
                StackBlur.canvasRGBA(ctx.canvas, rectX, rectY, layer.width, layer.height, layer.radius);
             }
        }
        
        ctx.restore();
    }

    const outputBuffer = canvas.toBuffer('image/png');
    res.json({ success: true, url: `data:image/png;base64,${outputBuffer.toString('base64')}` });

  } catch (error) {
    console.error(`[Template Apply] Error processing template:`, error);
    res.status(400).json({ success: false, message: error.message || '模板应用时发生未知错误' });
  }
});

module.exports = router; 