const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Cache = require('node-cache');

// 使用缓存来存储验证码的正确位置，设置10分钟过期
const captchaCache = new Cache({ stdTTL: 600, checkperiod: 120 });

const PUZZLE_SIZE = 60; // 拼图块的大小
const IMAGE_WIDTH = 310; // 背景图宽度
const IMAGE_HEIGHT = 160; // 背景图高度

// 存放背景图片的目录
const backgroundDir = path.join(__dirname, '../../uploads/ai_assets');
let backgroundImages = [];
try {
    // 过滤掉非图片文件和缩略图目录
    backgroundImages = fs.readdirSync(backgroundDir).filter(file => 
        /\.(png|jpg|jpeg)$/i.test(file) && !fs.statSync(path.join(backgroundDir, file)).isDirectory()
    );
} catch (error) {
    console.error('Error reading background images directory:', error);
    // 如果目录不存在或读取失败，保持为空数组，让后续逻辑处理
}


/**
 * 创建一个拼图形状的SVG
 * @param {'piece' | 'hole'} type - 'piece' for the draggable part, 'hole' for the target area
 * @returns {Buffer} - SVG buffer
 */
const createPuzzleSvg = (type) => {
    // 这是一个简化的拼图路径，可以根据需要变得更复杂
    const d = `M10,10 h15 a5,5 0 0,1 5,5 v15 h-15 a5,5 0 0,0 -5,-5 v-15 Z`;
    if (type === 'piece') {
        // 创建一个带有白色边框和阴影的实体拼图块
        return Buffer.from(
            `<svg width="${PUZZLE_SIZE}" height="${PUZZLE_SIZE}" xmlns="http://www.w3.org/2000/svg">
                <path d="${d}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2"/>
                <path d="${d}" fill="transparent" filter="url(#shadow)"/>
                <filter id="shadow">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
                </filter>
            </svg>`
        );
    }
    // 创建一个用于在背景上"挖洞"的形状
    return Buffer.from(
        `<svg width="${PUZZLE_SIZE}" height="${PUZZLE_SIZE}"><path d="${d}" fill="#000000"/></svg>`
    );
};


/**
 * 生成一个新的滑块验证码
 * @returns {Promise<{captchaId: string, backgroundImage: string, pieceImage: string, positionY: number}>}
 */
async function generateCaptcha() {
    if (backgroundImages.length === 0) {
        throw new Error('No background images found for captcha.');
    }
    // 1. 随机选择一张背景图
    const randomImage = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    const imagePath = path.join(backgroundDir, randomImage);

    const backgroundSharp = sharp(imagePath).resize(IMAGE_WIDTH, IMAGE_HEIGHT);

    // 2. 随机生成拼图的位置 (x, y)
    const positionX = Math.floor(Math.random() * (IMAGE_WIDTH / 2 - PUZZLE_SIZE)) + IMAGE_WIDTH / 2;
    const positionY = Math.floor(Math.random() * (IMAGE_HEIGHT - PUZZLE_SIZE * 2)) + PUZZLE_SIZE / 2;

    // 3. 从背景图中裁剪出拼图块
    const pieceBuffer = await backgroundSharp
        .clone()
        .extract({ left: positionX, top: positionY, width: PUZZLE_SIZE, height: PUZZLE_SIZE })
        .toBuffer();

    // 4. 创建拼图的SVG遮罩
    const pieceSvg = createPuzzleSvg('piece');

    // 5. 将裁剪的图片与SVG遮罩合成，形成最终的拼图块
    const finalPiece = await sharp(pieceBuffer)
        .composite([{ input: pieceSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // 6. 在背景图上挖出拼图缺口
    const holeSvg = createPuzzleSvg('hole');
    const finalBackground = await backgroundSharp
        .clone()
        .composite([{ input: holeSvg, top: positionY, left: positionX, blend: 'dest-out' }])
        .png()
        .toBuffer();

    // 7. 生成唯一的captchaId，并将正确位置存储起来
    const captchaId = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    captchaCache.set(captchaId, { x: positionX, y: positionY });

    console.log(`[Captcha] Generated: ID=${captchaId}, Correct X=${positionX}`);

    return {
        captchaId,
        backgroundImage: `data:image/png;base64,${finalBackground.toString('base64')}`,
        pieceImage: `data:image/png;base64,${finalPiece.toString('base64')}`,
        positionY,
    };
}

/**
 * 验证用户滑块位置
 * @param {string} captchaId - The ID of the captcha to verify
 * @param {number} userX - The x-position submitted by the user
 * @returns {boolean} - True if the position is correct, false otherwise
 */
function verifyCaptcha(captchaId, userX) {
    console.log('--- [Captcha Verification START] ---');
    if (!captchaId || userX === undefined) {
        console.error('[Captcha ERROR] Missing captchaId or userX.', { captchaId, userX });
        console.log('--- [Captcha Verification END] ---');
        return false;
    }
    
    console.log(`[Captcha INFO] Received verification request for ID: ${captchaId} with X-position: ${userX}`);
    
    const stored = captchaCache.get(captchaId);
    if (!stored) {
        console.error(`[Captcha ERROR] No entry found in cache for ID: ${captchaId}. Cache might have expired.`);
        console.log(`[Captcha INFO] Current cache keys:`, captchaCache.keys());
        console.log('--- [Captcha Verification END] ---');
        return false;
    }

    console.log(`[Captcha INFO] Found stored data for ID ${captchaId}:`, stored);

    // 容忍 +/- 5像素的误差
    const tolerance = 5;
    const difference = Math.abs(userX - stored.x);
    const isCorrect = difference <= tolerance;

    console.log(`[Captcha INFO] Comparing positions: User X=${userX}, Correct X=${stored.x}, Difference=${difference}, Tolerance=${tolerance}, Result=${isCorrect}`);

    // 验证成功或失败后立即删除，防止重放攻击
    console.log(`[Captcha INFO] Deleting ID ${captchaId} from cache after verification.`);
    captchaCache.del(captchaId);
    
    console.log('--- [Captcha Verification END] ---');
    return isCorrect;
}

module.exports = { generateCaptcha, verifyCaptcha }; 