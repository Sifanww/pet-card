import { useState, useRef, useCallback } from 'react';
import { Globe, Upload, Download, Loader2 } from 'lucide-react';

function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aiProcessedImage, setAiProcessedImage] = useState<string | null>(null);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [petName, setPetName] = useState('');
  const [sex, setSex] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [breed, setBreed] = useState('');

  const [aiProvider, setAiProvider] = useState<'nano' | 'hunyuan'>('nano');

  const handleProviderChange = (provider: 'nano' | 'hunyuan') => {
    setAiProvider(provider);
    // Reset AI result when switching provider
    setAiProcessedImage(null);
    setCardImage(null);
    finalPhotoRef.current = null;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store the final photo URL for regeneration
  const finalPhotoRef = useRef<string | null>(null);

  const generateCard = useCallback((photoUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = 900;
      const H = 600;
      canvas.width = W;
      canvas.height = H;

      // Background - warm beige
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(0, 0, W, H);

      // Top header bar
      ctx.fillStyle = '#1a3a5c';
      ctx.fillRect(0, 0, W, 65);
      ctx.fillStyle = '#f5e6c8';
      ctx.font = 'bold 30px Comic Sans MS';
      ctx.textAlign = 'left';
      ctx.fillText('PET IDENTIFICATION CARD', 30, 44);

      // Photo area - left side (bigger)
      const photoX = 30;
      const photoY = 85;
      const photoW = 340;
      const photoH = 435;

      // Photo border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(photoX - 5, photoY - 5, photoW + 10, photoH + 10);
      ctx.strokeStyle = '#1a3a5c';
      ctx.lineWidth = 3;
      ctx.strokeRect(photoX - 5, photoY - 5, photoW + 10, photoH + 10);

      // Draw pet photo
      const scale = Math.max(photoW / img.width, photoH / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const cx = (sw - photoW) / 2;
      const cy = (sh - photoH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, photoY, photoW, photoH);
      ctx.clip();
      ctx.drawImage(img, photoX - cx, photoY - cy, sw, sh);
      ctx.restore();

      // Info area - right side
      const infoX = 430;
      const infoStartY = 105;
      const lineH = 90;
      const labelColor = '#1a3a5c';
      const valueColor = '#333333';
      const subLabelColor = '#999999';

      const drawField = (label: string, subLabel: string, value: string, y: number) => {
        ctx.textAlign = 'left';
        // English label
        ctx.font = 'bold 22px Comic Sans MS';
        ctx.fillStyle = labelColor;
        const labelWidth = ctx.measureText(label).width;
        ctx.fillText(label, infoX, y);
        // Chinese sub-label with separator
        ctx.font = '20px FangSong';
        ctx.fillStyle = subLabelColor;
        ctx.fillText('  |  ' + subLabel, infoX + labelWidth, y);
        // Value on next line
        ctx.font = '26px Comic Sans MS';
        ctx.fillStyle = valueColor;
        ctx.fillText(value || '—', infoX, y + 35);
      };
      
      let y = infoStartY;
      drawField('NAME', '姓名', petName, y);
      y += lineH;
      drawField('SEX', '性别', sex, y);
      y += lineH;
      drawField('BREED', '品种', breed, y);
      y += lineH;
      drawField('DATE OF BIRTH', '出生日期', birthday, y);
      y += lineH;
      drawField('OWNER', '宠物主人', ownerName, y);

      // Draw cute paw print in the bottom-right empty area
      ctx.font = '100px Comic Sans MS';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.18;
      ctx.save();
      ctx.translate(800, 500);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText('🐾', 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1.0;

      // Bottom bar
      ctx.fillStyle = '#1a3a5c';
      ctx.fillRect(0, H - 55, W, 55);
      ctx.fillStyle = '#f5e6c8';
      ctx.font = 'bold 20px Comic Sans MS';
      ctx.textAlign = 'center';
      ctx.fillText('THIS IS THE IDENTIFICATION CARD OF MY PET.', W / 2, H - 20);

      setCardImage(canvas.toDataURL('image/png'));
    };
    img.src = photoUrl;
  }, [petName, sex, ownerName, birthday, breed]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setUploadedImage(imageUrl);
      setCardImage(null);
      setAiProcessedImage(null);
      setError(null);
      finalPhotoRef.current = null;
    };
    reader.readAsDataURL(file);
  };

  const compressImage = (dataUrl: string, maxWidth = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });
  };

  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setCardImage(null);
    setError(null);

    // If AI already processed, just regenerate card with new info
    if (finalPhotoRef.current) {
      generateCard(finalPhotoRef.current);
      return;
    }

    setLoading(true);
    try {
      const compressed = await compressImage(uploadedImage);
      const endpoint = aiProvider === 'hunyuan' ? '/api/hunyuan-image' : '/api/image-to-image';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          text.length === 0
            ? '服务器返回了空响应，可能是函数超时或未部署。请检查 Vercel 日志。'
            : '服务器返回了非 JSON 响应: ' + text.slice(0, 200)
        );
      }

      if (!res.ok || !data.image) {
        throw new Error(data.error || 'AI 处理失败，状态码: ' + res.status);
      }

      const processedUrl = 'data:image/png;base64,' + data.image;
      setAiProcessedImage(processedUrl);
      finalPhotoRef.current = processedUrl;
      generateCard(processedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      finalPhotoRef.current = uploadedImage;
      generateCard(uploadedImage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!cardImage) return;
    const link = document.createElement('a');
    link.href = cardImage;
    link.download = 'pet-id-card.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setAiProcessedImage(null);
    setCardImage(null);
    setError(null);
    setPetName(''); setSex(''); setOwnerName(''); setBirthday('');
    setBreed('');
    finalPhotoRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-blue-200 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
            <Globe className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Pet ID Card</h1>
          <p className="text-lg text-gray-800 italic">Create an identification card for your furry friend</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="text-sm text-gray-600">AI Model:</span>
            <button
              onClick={() => handleProviderChange('nano')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                aiProvider === 'nano'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              🤖 Nano
            </button>
            <button
              onClick={() => handleProviderChange('hunyuan')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                aiProvider === 'hunyuan'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              🎨 混元生图
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          {/* Input Section */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-gray-900">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">1. Pet Information</h2>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left: Photo Upload */}
              <div className="lg:col-span-3">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="file-upload" />
                {uploadedImage ? (
                  <label htmlFor="file-upload" className="block cursor-pointer">
                    <img src={uploadedImage} alt="Pet" className="w-full h-[22rem] object-cover rounded-xl border-4 border-gray-200 hover:opacity-80 transition-opacity" />
                    <p className="text-sm text-gray-500 text-center mt-2">Click to change</p>
                  </label>
                ) : (
                  <label htmlFor="file-upload" className="border-4 border-dashed border-gray-300 rounded-xl h-[22rem] flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 text-sm">Upload pet photo</p>
                  </label>
                )}
              </div>

              {/* Right: Form Fields */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">🐾 Pet Name | 姓名</label>
                  <input type="text" value={petName} onChange={e => setPetName(e.target.value)} placeholder="e.g. Toto" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">⚧ Sex | 性别</label>
                  <select value={sex} onChange={e => setSex(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm">
                    <option value="">Select</option>
                    <option value="♂ Male">♂ Male</option>
                    <option value="♀ Female">♀ Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">🧬 Breed | 品种</label>
                  <input type="text" value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Schnauzer" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">🎂 Birthday | 出生日期</label>
                  <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">👤 Owner | 主人</label>
                  <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="e.g. John" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm" />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 mt-6">
              {uploadedImage && (
                <button onClick={handleGenerate} disabled={loading} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  🎨 Generate Card
                </button>
              )}
              {uploadedImage && (
                <button onClick={handleReset} className="flex-1 py-3 bg-orange-300 text-gray-900 rounded-xl font-semibold hover:bg-orange-200 transition-colors border-3 border-gray-900">
                  🗑️ Reset All
                </button>
              )}
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-gray-900">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">2. Your Pet ID Card</h2>

            {loading ? (
              <div className="border-4 border-dashed border-gray-300 rounded-xl p-12 h-80 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-gray-500">AI is processing your pet photo...</p>
                <p className="text-gray-400 text-sm">Removing background & adjusting pose</p>
              </div>
            ) : cardImage ? (
              <div className="space-y-6">
                {error && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 text-yellow-800 text-sm">
                    ⚠️ AI processing failed: {error}. Using original image.
                  </div>
                )}
                {aiProcessedImage && !error && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 text-green-800 text-sm">
                    ✅ AI enhanced: background removed, white backdrop applied.
                  </div>
                )}
                <div className="bg-gray-100 rounded-xl p-4 border-2 border-gray-200 flex justify-center">
                  <img src={cardImage} alt="Pet ID Card" className="max-w-full rounded-lg shadow-lg" />
                </div>
                <button onClick={handleDownload} className="w-full py-4 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  DOWNLOAD PET ID CARD
                </button>
              </div>
            ) : (
              <div className="border-4 border-dashed border-gray-300 rounded-xl p-12 h-80 flex items-center justify-center">
                <p className="text-gray-400">Upload a photo and fill in the info to generate your pet's ID card</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default App;
