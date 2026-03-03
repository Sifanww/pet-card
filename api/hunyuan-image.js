import { fal } from '@fal-ai/client';
import tencentcloud from 'tencentcloud-sdk-nodejs';

fal.config({ credentials: process.env.FAL_KEY });

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const file = new File([buffer], 'pet.png', { type: 'image/png' });
    const imageUrl = await fal.storage.upload(file);

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

    if (!result.ResultImage) {
      return res.status(500).json({ error: 'No image returned from Hunyuan' });
    }

    res.json({ image: result.ResultImage });
  } catch (err) {
    console.error('Hunyuan error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
}
