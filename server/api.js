import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fal } from '@fal-ai/client';
import tencentcloud from 'tencentcloud-sdk-nodejs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

fal.config({ credentials: process.env.FAL_KEY });

// Tencent Cloud Hunyuan setup
const AiartClient = tencentcloud.aiart.v20221229.Client;

function getTencentClient() {
  return new AiartClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY,
    },
    region: process.env.TENCENT_REGION || 'ap-guangzhou',
    profile: {
      httpProfile: { endpoint: 'aiart.tencentcloudapi.com' },
    },
  });
}

app.post('/api/image-to-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Upload base64 image to fal storage
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const file = new File([buffer], 'pet.png', { type: 'image/png' });
    const imageUrl = await fal.storage.upload(file);
    console.log('Uploaded image URL:', imageUrl);

    // Call nano-banana edit
    const result = await fal.subscribe('fal-ai/nano-banana/edit', {
      input: {
        prompt: 'Professional and high-quality pet identification photos, with a denim blue background, professional studio lighting, studio shooting effect, high resolution, clear and sharp details. The pet faces the camera, positioned at the level of the eyes, presenting a natural sitting or standing posture, with the head, chest and upper body clearly visible, but not showing the full body image. The facial features are detailed and exquisite, with a cute expression. The composition is centered, symmetrical, clear and balanced.',
        image_urls: [imageUrl],
        num_images: 1,
        output_format: 'png',
        aspect_ratio: '3:4',
      },
    });

    console.log('AI result:', result.data?.description);
    const resultUrl = result.data?.images?.[0]?.url;

    if (!resultUrl) {
      return res.status(500).json({ error: 'No image returned from AI' });
    }

    // Fetch result image and convert to base64
    const imgRes = await fetch(resultUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const base64Result = imgBuffer.toString('base64');

    res.json({ image: base64Result });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Hunyuan ReplaceBackground endpoint
app.post('/api/hunyuan-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Upload to fal storage to get a public URL (ReplaceBackground requires URL)
    const buffer = Buffer.from(base64Data, 'base64');
    const file = new File([buffer], 'pet.png', { type: 'image/png' });
    const imageUrl = await fal.storage.upload(file);
    console.log('Hunyuan: uploaded image URL:', imageUrl);

    const client = getTencentClient();

    const params = {
      ProductUrl: imageUrl,
      Prompt: '纯色牛仔蓝背景，干净简洁，专业证件照背景',
      Product: '宠物',
      Resolution: '768:1024',
      RspImgType: 'base64',
      LogoAdd: 0,
    };

    const result = await client.ReplaceBackground(params);
    console.log('Hunyuan ReplaceBackground RequestId:', result.RequestId);

    if (!result.ResultImage) {
      return res.status(500).json({ error: 'No image returned from Hunyuan' });
    }

    res.json({ image: result.ResultImage });
  } catch (err) {
    console.error('Hunyuan error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
