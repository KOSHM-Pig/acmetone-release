const express = require('express');
const axios = require('axios');
const router = express.Router();
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');
const { AIGenerationAsset } = require('../models');
const { sequelize } = require('../config/db');
const { adminAuth } = require('../middleware/auth');
const sharp = require('sharp');

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/images/generations';
// For production, it is strongly recommended to use environment variables for the API key.
const SILICONFLOW_API_KEY = 'sk-tskigfapmhnfjicxkpzyxcvpfvlpsupiavgvyxczloetdjbg';

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

/**
 * @swagger
 * /api/ai/generate-cover:
 *   post:
 *     summary: Generate an album cover using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Text prompt for the image generation.
 *                 example: "A majestic lion wearing a crown, epic fantasy art, cinematic lighting"
 *               style:
 *                 type: string
 *                 description: The style template for the image.
 *                 example: "cinematic-default"
 *     responses:
 *       200:
 *         description: Successfully generated image URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: The URL of the generated image.
 *       400:
 *         description: Bad request, missing prompt
 *       500:
 *         description: Error from the AI generation service or internal server error
 */
router.post('/generate-cover', async (req, res) => {
    const { prompt, style } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required.' });
    }

    // You can expand this with more sophisticated style templates
    let finalPrompt = prompt;
    switch (style) {
        case 'cinematic':
            finalPrompt = `cinematic, dramatic lighting, epic, ${prompt}`;
            break;
        case 'anime':
            finalPrompt = `anime style, key visual, beautiful, intricate, ${prompt}`;
            break;
        case 'photorealistic':
            finalPrompt = `photorealistic, 8k, sharp focus, detailed, ${prompt}`;
            break;
        case 'minimalist':
            finalPrompt = `minimalist, clean, simple, vector art, ${prompt}`;
            break;
    }

    try {
        const response = await axios.post(SILICONFLOW_API_URL, {
            model: "Kwai-Kolors/Kolors",
            prompt: finalPrompt,
            negative_prompt: "blurry, low quality, text, watermark, signature",
            image_size: "1024x1024",
            num_inference_steps: 30, // Higher steps for better quality
            guidance_scale: 7.5,
        }, {
            headers: {
                'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.data && response.data.images && response.data.images.length > 0) {
            const imageUrl = response.data.images[0].url;

            // --- Scale image to 3000x3000 ---
            const imageBufferResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const originalImage = await loadImage(Buffer.from(imageBufferResponse.data));

            const canvas = createCanvas(3000, 3000);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(originalImage, 0, 0, 3000, 3000);

            const dataUrl = canvas.toDataURL('image/png');
            
            res.json({ url: dataUrl }); // Return the new base64 data URL

        } else {
            // Forward the error from the service if available
            res.status(500).json({ message: "AI service did not return an image.", details: response.data });
        }
    } catch (error) {
        console.error('Error calling SiliconFlow API:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            message: 'Failed to generate AI cover.', 
            details: error.response ? error.response.data : 'An internal error occurred.' 
        });
    }
});

/**
 * @swagger
 * /api/ai/save-asset:
 *   post:
 *     summary: Saves a generated image as a high-quality asset.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image_url:
 *                 type: string
 *               prompt:
 *                 type: string
 *               negative_prompt:
 *                 type: string
 *               seed:
 *                 type: integer
 *               num_inference_steps:
 *                 type: integer
 *               guidance_scale:
 *                 type: number
 *               model_name:
 *                 type: string
 *               style:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset saved successfully.
 *       500:
 *         description: Failed to save asset.
 */
router.post('/save-asset', adminAuth, async (req, res) => {
    const { image_url, prompt, negative_prompt, seed, num_inference_steps, guidance_scale, model_name, style } = req.body;

    if (!image_url || !prompt) {
        return res.status(400).json({ message: 'Image URL and prompt are required.' });
    }

    try {
        // 1. Download the image
        const imageResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
        
        // 2. Save image to local storage
        const assetsDir = path.join(__dirname, '../../uploads/ai_assets');
        const imageFileName = `${Date.now()}_${seed || 'N_A'}.png`;
        const imagePath = path.join(assetsDir, imageFileName);
        const relativePath = `uploads/ai_assets/${imageFileName}`;
        
        ensureDirectoryExistence(imagePath);
        fs.writeFileSync(imagePath, imageResponse.data);

        // 3. Save metadata to database
        const newAsset = await AIGenerationAsset.create({
            prompt,
            negative_prompt,
            image_path: relativePath,
            seed,
            num_inference_steps,
            guidance_scale,
            model_name: model_name || "Kwai-Kolors/Kolors",
            style
        });

        res.status(201).json(newAsset);
    } catch (error) {
        console.error('Error saving AI asset:', error);
        res.status(500).json({ message: 'Failed to save AI asset.', details: error.message });
    }
});

/**
 * @swagger
 * /api/ai/assets:
 *   get:
 *     summary: Retrieves all saved AI generation assets.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of assets.
 *       500:
 *         description: Failed to retrieve assets.
 */
router.get('/assets', adminAuth, async (req, res) => {
    try {
        const assets = await AIGenerationAsset.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(assets);
    } catch (error) {
        console.error('Error fetching AI assets:', error);
        res.status(500).json({ message: 'Failed to retrieve AI assets.', details: error.message });
    }
});

/**
 * Helper function to create thumbnail for an image
 * @param {string} originalPath - Path to original image
 * @returns {string} - Path to thumbnail
 */
async function createThumbnail(originalPath) {
    // Ensure the original file exists
    if (!fs.existsSync(path.join(__dirname, '../../', originalPath))) {
        throw new Error('Original image not found');
    }
    
    // Create thumbnails directory if it doesn't exist
    const originalDir = path.dirname(originalPath);
    const thumbDir = path.join(originalDir, 'thumbnails');
    const fullThumbDir = path.join(__dirname, '../../', thumbDir);
    
    if (!fs.existsSync(fullThumbDir)) {
        fs.mkdirSync(fullThumbDir, { recursive: true });
    }
    
    // Generate thumbnail filename
    const filename = path.basename(originalPath);
    const thumbnailPath = path.join(thumbDir, `thumb_${filename}`);
    const fullThumbnailPath = path.join(__dirname, '../../', thumbnailPath);
    
    // Only create thumbnail if it doesn't exist already
    if (!fs.existsSync(fullThumbnailPath)) {
        await sharp(path.join(__dirname, '../../', originalPath))
            .resize(300, 300, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toFile(fullThumbnailPath);
    }
    
    return thumbnailPath;
}

/**
 * @swagger
 * /api/ai/assets/random:
 *   get:
 *     summary: Retrieves a random selection of AI generation assets.
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 4
 *         description: The number of random assets to return.
 *     responses:
 *       200:
 *         description: A list of random assets.
 *       500:
 *         description: Failed to retrieve assets.
 */
router.get('/assets/random', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 4;
    try {
        const assets = await AIGenerationAsset.findAll({
            order: sequelize.random(),
            limit: limit
        });
        
        // Process each asset to add thumbnail path
        const processedAssets = await Promise.all(assets.map(async (asset) => {
            const assetObj = asset.toJSON();
            try {
                // Create thumbnail if it doesn't exist
                const thumbnailPath = await createThumbnail(asset.image_path);
                assetObj.thumbnail_path = thumbnailPath;
            } catch (error) {
                console.error(`Error creating thumbnail for ${asset.image_path}:`, error);
                assetObj.thumbnail_path = asset.image_path; // Fallback to original if thumbnail creation fails
            }
            return assetObj;
        }));
        
        res.json(processedAssets);
    } catch (error) {
        console.error('Error fetching random AI assets:', error);
        res.status(500).json({ message: 'Failed to retrieve random AI assets.', details: error.message });
    }
});

/**
 * @swagger
 * /api/ai/assets/{id}:
 *   delete:
 *     summary: Deletes a specific AI-generated asset.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the asset to delete.
 *     responses:
 *       200:
 *         description: Asset deleted successfully.
 *       404:
 *         description: Asset not found.
 *       500:
 *         description: Failed to delete asset.
 */
router.delete('/assets/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const asset = await AIGenerationAsset.findByPk(id);

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found.' });
        }

        // Delete the image file from storage
        if (asset.image_path) {
            const imagePath = path.join(__dirname, '../../', asset.image_path);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete the asset from the database
        await asset.destroy();

        res.status(200).json({ message: 'Asset deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting asset ${id}:`, error);
        res.status(500).json({ message: 'Failed to delete asset.', details: error.message });
    }
});

/**
 * @swagger
 * /api/ai/enhance-prompt:
 *   post:
 *     summary: Enhances a user prompt with a random high-quality prompt from the database.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: The enhanced prompt.
 *       404:
 *         description: No assets found to enhance prompt with.
 *       500:
 *         description: Server error.
 */
router.post('/enhance-prompt', adminAuth, async (req, res) => {
    const { prompt: userPrompt } = req.body;

    try {
        const randomAsset = await AIGenerationAsset.findOne({
            order: sequelize.random(),
        });

        if (!randomAsset) {
            return res.status(404).json({ message: 'No assets available for inspiration yet. Please save some high-quality images first.' });
        }

        const assetPromptParts = randomAsset.prompt.split(',').map(p => p.trim());
        const inspiration = assetPromptParts.slice(0, Math.min(assetPromptParts.length, 5)).join(', ');
        
        const enhancedPrompt = userPrompt ? `${inspiration}, ${userPrompt}` : inspiration;

        res.json({ enhancedPrompt });
    } catch (error) {
        console.error('Error enhancing prompt:', error);
        if (error.name === 'SequelizeDatabaseError') {
             // Fallback for databases that don't support RANDOM() e.g. SQL Server
             const fallbackAsset = await AIGenerationAsset.findOne();
             if (!fallbackAsset) {
                return res.status(404).json({ message: 'No assets available for inspiration yet.' });
             }
             const enhancedPrompt = userPrompt ? `${fallbackAsset.prompt}, ${userPrompt}` : fallbackAsset.prompt;
             return res.json({ enhancedPrompt });
        }
        res.status(500).json({ message: 'Failed to enhance prompt.', details: error.message });
    }
});

/**
 * @swagger
 * /api/ai/generate-for-training:
 *   post:
 *     summary: Generate an image for training purposes with advanced options.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               negative_prompt:
 *                 type: string
 *               style:
 *                 type: string
 *               image_size:
 *                 type: string
 *               seed:
 *                 type: integer
 *               num_inference_steps:
 *                 type: integer
 *               guidance_scale:
 *                 type: number
 *               batch_size:
 *                 type: integer
 *               reference_image:
 *                 type: string
 *                 format: byte
 *                 description: Base64 encoded reference image.
 *     responses:
 *       200:
 *         description: Successfully generated image(s).
 *       400:
 *         description: Bad request.
 *       500:
 *         description: AI service error or internal server error.
 */
router.post('/generate-for-training', adminAuth, async (req, res) => {
    const { 
        prompt, 
        negative_prompt, 
        style,
        image_size,
        seed,
        num_inference_steps,
        guidance_scale,
        batch_size = 1,
        reference_image 
    } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required.' });
    }

    let finalPrompt = prompt;
    switch (style) {
        case 'cinematic':
            finalPrompt = `cinematic, dramatic lighting, epic, ${prompt}`;
            break;
        case 'anime':
            finalPrompt = `anime style, key visual, beautiful, intricate, ${prompt}`;
            break;
        case 'photorealistic':
            finalPrompt = `photorealistic, 8k, sharp focus, detailed, ${prompt}`;
            break;
        case 'minimalist':
            finalPrompt = `minimalist, clean, simple, vector art, ${prompt}`;
            break;
    }
    
    try {
        const apiPayload = {
            model: "Kwai-Kolors/Kolors",
            prompt: finalPrompt,
            negative_prompt,
            image_size,
            num_inference_steps,
            guidance_scale,
            batch_size,
        };

        if (seed) {
            apiPayload.seed = parseInt(seed, 10);
        }
        if (reference_image) {
            apiPayload.image = reference_image;
        }

        const response = await axios.post(SILICONFLOW_API_URL, apiPayload, {
            headers: {
                'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error calling SiliconFlow API for training:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            message: 'Failed to generate image for training.', 
            details: error.response ? error.response.data : 'An internal error occurred.' 
        });
    }
});

/**
 * Ensures all AI assets have thumbnails
 * This function checks all assets and creates thumbnails for any that don't have them
 */
async function ensureThumbnailsForAllAssets() {
    try {
        console.log('[AI Assets] Starting thumbnail generation for all assets without thumbnails...');
        const assets = await AIGenerationAsset.findAll();
        let created = 0;
        let skipped = 0;
        let failed = 0;

        for (const asset of assets) {
            if (!asset.image_path) {
                skipped++;
                continue;
            }

            try {
                // Check if thumbnail already exists
                const originalDir = path.dirname(asset.image_path);
                const thumbDir = path.join(originalDir, 'thumbnails');
                const filename = path.basename(asset.image_path);
                const thumbnailPath = path.join(thumbDir, `thumb_${filename}`);
                const fullThumbnailPath = path.join(__dirname, '../../', thumbnailPath);
                
                if (fs.existsSync(fullThumbnailPath)) {
                    skipped++;
                    continue;
                }

                // Create thumbnail
                await createThumbnail(asset.image_path);
                created++;
            } catch (error) {
                console.error(`[AI Assets] Failed to create thumbnail for asset ${asset.id}:`, error);
                failed++;
            }
        }

        console.log(`[AI Assets] Thumbnail generation complete: ${created} created, ${skipped} already existed, ${failed} failed`);
    } catch (error) {
        console.error('[AI Assets] Error ensuring thumbnails for all assets:', error);
    }
}

// Call the function to ensure thumbnails when the server starts
// We use setTimeout to not block the server startup
setTimeout(() => {
    ensureThumbnailsForAllAssets();
}, 5000); // Wait 5 seconds after server start to begin processing

module.exports = router; 