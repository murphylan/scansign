'use client';

import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Image as ImageIcon, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

// 预设渐变背景
const PRESET_GRADIENTS = [
  {
    id: 'purple-night',
    name: '紫夜',
    value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  {
    id: 'ocean-blue',
    name: '海洋蓝',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'sunset',
    name: '日落',
    value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'forest',
    name: '森林',
    value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
  {
    id: 'aurora',
    name: '极光',
    value: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)',
  },
  {
    id: 'fire',
    name: '烈焰',
    value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
  },
  {
    id: 'midnight',
    name: '午夜',
    value: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
  },
  {
    id: 'rose',
    name: '玫瑰',
    value: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
  },
  {
    id: 'tech',
    name: '科技',
    value: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
  },
  {
    id: 'neon',
    name: '霓虹',
    value: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ff00ff 100%)',
  },
  {
    id: 'gold',
    name: '金色',
    value: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)',
  },
  {
    id: 'rainbow',
    name: '彩虹',
    value: 'linear-gradient(135deg, #ff0000 0%, #ff7f00 17%, #ffff00 33%, #00ff00 50%, #0000ff 67%, #4b0082 83%, #9400d3 100%)',
  },
];

export interface BackgroundConfig {
  type: 'gradient' | 'image' | 'color';
  value: string;
}

interface BackgroundPickerProps {
  value: BackgroundConfig;
  onChange: (config: BackgroundConfig) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export function BackgroundPicker({ value, onChange, onImageUpload }: BackgroundPickerProps) {
  const [activeTab, setActiveTab] = useState<'gradient' | 'image' | 'color'>(value.type);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGradientSelect = (gradient: typeof PRESET_GRADIENTS[0]) => {
    onChange({ type: 'gradient', value: gradient.value });
  };

  const handleColorChange = (color: string) => {
    onChange({ type: 'color', value: color });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setUploadError('请选择图片文件');
      return;
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('图片大小不能超过 5MB');
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      if (onImageUpload) {
        // 使用外部上传处理
        const url = await onImageUpload(file);
        onChange({ type: 'image', value: url });
      } else {
        // 使用 base64（适用于小图片）
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onChange({ type: 'image', value: base64 });
        };
        reader.readAsDataURL(file);
      }
    } catch {
      setUploadError('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange({ type: 'gradient', value: PRESET_GRADIENTS[0].value });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getPreviewStyle = (): React.CSSProperties => {
    if (value.type === 'gradient') {
      return { background: value.value };
    } else if (value.type === 'image') {
      return {
        backgroundImage: `url(${value.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    } else {
      return { backgroundColor: value.value };
    }
  };

  return (
    <div className="space-y-4">
      <Label>大屏背景</Label>

      {/* 预览 */}
      <div 
        className="w-full h-32 rounded-xl border border-border overflow-hidden relative"
        style={getPreviewStyle()}
      >
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <span className="text-white text-lg font-bold drop-shadow-lg">预览效果</span>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 p-1 bg-secondary rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('gradient')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
            activeTab === 'gradient'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Palette className="h-4 w-4" />
          渐变背景
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
            activeTab === 'image'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ImageIcon className="h-4 w-4" />
          自定义图片
        </button>
      </div>

      {/* 渐变选择 */}
      {activeTab === 'gradient' && (
        <div className="grid grid-cols-4 gap-3">
          {PRESET_GRADIENTS.map((gradient) => (
            <button
              key={gradient.id}
              type="button"
              onClick={() => handleGradientSelect(gradient)}
              className={cn(
                'aspect-video rounded-lg overflow-hidden border-2 transition-all',
                value.type === 'gradient' && value.value === gradient.value
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent hover:border-border'
              )}
              style={{ background: gradient.value }}
              title={gradient.name}
            >
              <span className="sr-only">{gradient.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 图片上传 */}
      {activeTab === 'image' && (
        <div className="space-y-3">
          {value.type === 'image' && value.value ? (
            <div className="relative">
              <div 
                className="w-full h-40 rounded-lg bg-cover bg-center border border-border"
                style={{ backgroundImage: `url(${value.value})` }}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label 
              className={cn(
                'flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                uploading
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary hover:bg-primary/5'
              )}
            >
              <div className="flex flex-col items-center justify-center py-6">
                {uploading ? (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      点击上传背景图片
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      支持 JPG、PNG、GIF，最大 5MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          )}

          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}

          {/* URL 输入 */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">或输入图片链接</Label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={value.type === 'image' ? value.value : ''}
              onChange={(e) => {
                if (e.target.value) {
                  onChange({ type: 'image', value: e.target.value });
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { PRESET_GRADIENTS };

