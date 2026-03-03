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

// Hunyuan Image-to-Image endpoint
app.post('/api/hunyuan-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const client = getTencentClient();

    const params = {
      InputImage: base64Data,
      Prompt: '专业高质量宠物证件照，牛仔蓝背景，专业摄影棚灯光，高分辨率，清晰锐利细节。宠物面对镜头，自然坐姿或站姿，头部胸部清晰可见，面部特征精致，表情可爱，构图居中对称。',
      Styles: ['201'],
      ResultConfig: { Resolution: '768:1024' },
      Strength: 0.6,
      RspImgType: 'base64',
      LogoAdd: 0,
    };

    const result = await client.ImageToImage(params);
    console.log('Hunyuan result RequestId:', result.RequestId);

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
