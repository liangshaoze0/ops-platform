import { useEffect, useState } from 'react'
import './BackgroundDisplay.css'

const BackgroundDisplay = ({ background }) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (background?.image_url) {
      setImageLoaded(false)
      const img = new Image()
      img.onload = () => setImageLoaded(true)
      img.src = background.image_url
    }
  }, [background])

  if (!background?.image_url) return null

  return (
    <div className="background-display">
      <div
        className={`background-image ${imageLoaded ? 'loaded' : ''}`}
        style={{
          backgroundImage: `url(${background.image_url})`,
        }}
      >
        {!imageLoaded && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>加载背景图...</p>
          </div>
        )}
      </div>
      <div className="background-overlay"></div>
    </div>
  )
}

export default BackgroundDisplay
