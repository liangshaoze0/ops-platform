import { useState } from 'react'
import api from '../services/api'
import './BackgroundGenerator.css'

const BackgroundGenerator = ({ onGenerated, loading: initialLoading }) => {
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError(null)
    setGenerating(true)

    try {
      const response = await api.post('/ai/background', {
        width,
        height,
        prompt: prompt || undefined,
      })

      onGenerated(response.data.data)
    } catch (err) {
      setError(err.response?.data?.message || '生成背景图失败')
      console.error('生成背景图失败:', err)
    } finally {
      setGenerating(false)
    }
  }

  const presetSizes = [
    { label: '1920x1080', width: 1920, height: 1080 },
    { label: '1366x768', width: 1366, height: 768 },
    { label: '2560x1440', width: 2560, height: 1440 },
    { label: '3840x2160', width: 3840, height: 2160 },
  ]

  const applyPreset = (preset) => {
    setWidth(preset.width)
    setHeight(preset.height)
  }

  return (
    <form className="background-generator" onSubmit={handleGenerate}>
      <div className="form-group">
        <label>尺寸预设</label>
        <div className="preset-buttons">
          {presetSizes.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(preset)}
              disabled={generating}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="width">宽度 (px)</label>
          <input
            id="width"
            type="number"
            min="100"
            max="8000"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value) || 1920)}
            disabled={generating}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="height">高度 (px)</label>
          <input
            id="height"
            type="number"
            min="100"
            max="8000"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value) || 1080)}
            disabled={generating}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="prompt">描述（可选）</label>
        <input
          id="prompt"
          type="text"
          placeholder="例如：科技感蓝色渐变、星空主题..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={generating}
        />
        <small>提示词会影响生成的视觉效果</small>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        type="submit"
        className="generate-btn"
        disabled={generating || initialLoading}
      >
        {generating ? (
          <>
            <span className="spinner-small"></span>
            生成中...
          </>
        ) : (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M10 2v6m0 0v6m0-6h6m-6 0H4"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            生成背景图
          </>
        )}
      </button>
    </form>
  )
}

export default BackgroundGenerator
