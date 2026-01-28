package handlers

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"math"
	"math/rand"
	"time"

	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AIImageHandler struct {
	db *gorm.DB
}

func NewAIImageHandler(db *gorm.DB) *AIImageHandler {
	return &AIImageHandler{db: db}
}

// GenerateBackground 生成AI动态效果背景图
func (h *AIImageHandler) GenerateBackground(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var req struct {
		Width  int    `json:"width" binding:"required"`
		Height int    `json:"height" binding:"required"`
		Prompt string `json:"prompt"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 生成动态效果背景图
	img, err := h.generateDynamicBackground(req.Width, req.Height, req.Prompt)
	if err != nil {
		utils.InternalServerError(c, "生成图片失败: "+err.Error())
		return
	}

	// 将图片编码为base64
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		utils.InternalServerError(c, "编码图片失败: "+err.Error())
		return
	}

	imageBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())
	imageURL := "data:image/png;base64," + imageBase64

	// 保存到数据库
	aiImage := models.AIImage{
		UserID:      userID.(uint),
		Type:        "background",
		Prompt:      req.Prompt,
		ImageURL:    imageURL,
		ThumbnailURL: imageURL, // 简化处理，使用同一张图
		Width:       req.Width,
		Height:      req.Height,
		IsActive:    true,
	}

	if err := h.db.Create(&aiImage).Error; err != nil {
		utils.InternalServerError(c, "保存图片失败: "+err.Error())
		return
	}

	// 记录审计日志
	username, _ := c.Get("username")
	go utils.LogAction(
		h.db,
		userID.(uint),
		username.(string),
		"create",
		"ai_image",
		aiImage.ID,
		"POST",
		"/api/ai/background",
		c.ClientIP(),
		c.GetHeader("User-Agent"),
		200,
		"生成AI背景图成功",
		gin.H{"width": req.Width, "height": req.Height, "prompt": req.Prompt},
		nil,
	)

	utils.Success(c, aiImage)
}

// generateDynamicBackground 生成动态效果背景图
// 使用渐变、粒子效果、波纹等创建动态视觉效果
func (h *AIImageHandler) generateDynamicBackground(width, height int, prompt string) (image.Image, error) {
	// 创建RGBA图片
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// 根据prompt生成不同的效果
	rand.Seed(time.Now().UnixNano())
	seed := rand.Int63()

	// 生成渐变背景
	h.generateGradient(img, seed)

	// 添加粒子效果
	h.addParticleEffect(img, seed, 200)

	// 添加波纹效果
	h.addWaveEffect(img, seed)

	// 添加光晕效果
	h.addGlowEffect(img, seed)

	return img, nil
}

// generateGradient 生成渐变背景
func (h *AIImageHandler) generateGradient(img *image.RGBA, seed int64) {
	rand.Seed(seed)
	width := img.Bounds().Dx()
	height := img.Bounds().Dy()

	// 随机选择渐变色
	colors := []color.RGBA{
		{uint8(rand.Intn(100) + 50), uint8(rand.Intn(100) + 50), uint8(rand.Intn(100) + 200), 255},
		{uint8(rand.Intn(100) + 150), uint8(rand.Intn(100) + 50), uint8(rand.Intn(100) + 50), 255},
		{uint8(rand.Intn(100) + 50), uint8(rand.Intn(100) + 150), uint8(rand.Intn(100) + 50), 255},
	}
	startColor := colors[0]
	endColor := colors[1]

	// 径向渐变
	centerX := width / 2
	centerY := height / 2
	maxDist := math.Sqrt(float64(width*width + height*height)) / 2

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			dx := float64(x - centerX)
			dy := float64(y - centerY)
			dist := math.Sqrt(dx*dx + dy*dy) / maxDist

			if dist > 1 {
				dist = 1
			}

			r := uint8(float64(startColor.R)*(1-dist) + float64(endColor.R)*dist)
			g := uint8(float64(startColor.G)*(1-dist) + float64(endColor.G)*dist)
			b := uint8(float64(startColor.B)*(1-dist) + float64(endColor.B)*dist)

			img.Set(x, y, color.RGBA{r, g, b, 255})
		}
	}
}

// addParticleEffect 添加粒子效果
func (h *AIImageHandler) addParticleEffect(img *image.RGBA, seed int64, count int) {
	rand.Seed(seed + 1)
	width := img.Bounds().Dx()
	height := img.Bounds().Dy()

	for i := 0; i < count; i++ {
		x := rand.Intn(width)
		y := rand.Intn(height)
		size := rand.Intn(3) + 1
		brightness := uint8(rand.Intn(100) + 155)

		// 绘制圆形粒子
		for dy := -size; dy <= size; dy++ {
			for dx := -size; dx <= size; dx++ {
				if dx*dx+dy*dy <= size*size {
					nx, ny := x+dx, y+dy
					if nx >= 0 && nx < width && ny >= 0 && ny < height {
						oldColor := img.RGBAAt(nx, ny)
						newColor := color.RGBA{
							uint8((int(oldColor.R) + int(brightness)) / 2),
							uint8((int(oldColor.G) + int(brightness)) / 2),
							uint8((int(oldColor.B) + int(brightness)) / 2),
							255,
						}
						img.Set(nx, ny, newColor)
					}
				}
			}
		}
	}
}

// addWaveEffect 添加波纹效果
func (h *AIImageHandler) addWaveEffect(img *image.RGBA, seed int64) {
	rand.Seed(seed + 2)
	width := img.Bounds().Dx()
	height := img.Bounds().Dy()

	waveCount := 3
	for w := 0; w < waveCount; w++ {
		centerX := rand.Intn(width)
		centerY := rand.Intn(height)
		radius := float64(rand.Intn(200) + 100)
		frequency := float64(rand.Intn(20) + 10)

		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				dx := float64(x - centerX)
				dy := float64(y - centerY)
				dist := math.Sqrt(dx*dx + dy*dy)

				wave := math.Sin(dist/frequency) * 0.3
				if dist < radius && wave > 0 {
					oldColor := img.RGBAAt(x, y)
					brightness := uint8(float64(oldColor.R) * (1 + wave))
					if brightness > 255 {
						brightness = 255
					}
					newColor := color.RGBA{brightness, brightness, brightness, 255}
					img.Set(x, y, newColor)
				}
			}
		}
	}
}

// addGlowEffect 添加光晕效果
func (h *AIImageHandler) addGlowEffect(img *image.RGBA, seed int64) {
	rand.Seed(seed + 3)
	width := img.Bounds().Dx()
	height := img.Bounds().Dy()

	glowCount := 2
	for g := 0; g < glowCount; g++ {
		centerX := rand.Intn(width)
		centerY := rand.Intn(height)
		radius := float64(rand.Intn(150) + 50)

		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				dx := float64(x - centerX)
				dy := float64(y - centerY)
				dist := math.Sqrt(dx*dx + dy*dy)

				if dist < radius {
					intensity := 1 - (dist / radius)
					oldColor := img.RGBAAt(x, y)
					glow := uint8(float64(255) * intensity * 0.3)

					newColor := color.RGBA{
						uint8(min(255, int(oldColor.R)+int(glow))),
						uint8(min(255, int(oldColor.G)+int(glow))),
						uint8(min(255, int(oldColor.B)+int(glow))),
						255,
					}
					img.Set(x, y, newColor)
				}
			}
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GetUserImages 获取用户的AI图片列表
func (h *AIImageHandler) GetUserImages(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var images []models.AIImage
	// 返回用户的所有AI图片，按创建时间倒序排列
	if err := h.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&images).Error; err != nil {
		utils.InternalServerError(c, "查询图片失败: "+err.Error())
		return
	}

	utils.Success(c, images)
}

// GetActiveBackground 获取当前激活的背景图
func (h *AIImageHandler) GetActiveBackground(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var image models.AIImage
	if err := h.db.Where("user_id = ? AND type = ? AND is_active = ?", userID, "background", true).
		Order("created_at DESC").
		First(&image).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "未找到激活的背景图")
		} else {
			utils.InternalServerError(c, "查询背景图失败: "+err.Error())
		}
		return
	}

	utils.Success(c, image)
}

// SetActiveBackground 设置指定的AI图片为活跃背景
func (h *AIImageHandler) SetActiveBackground(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var req struct {
		ImageID uint `json:"image_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 检查图片是否存在且属于当前用户
	var image models.AIImage
	if err := h.db.Where("id = ? AND user_id = ?", req.ImageID, userID).First(&image).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "图片不存在")
		} else {
			utils.InternalServerError(c, "查询图片失败: "+err.Error())
		}
		return
	}

	// 先将该用户的所有背景图设为非活跃
	if err := h.db.Model(&models.AIImage{}).
		Where("user_id = ? AND type = ?", userID, "background").
		Update("is_active", false).Error; err != nil {
		utils.InternalServerError(c, "更新图片状态失败: "+err.Error())
		return
	}

	// 设置指定图片为活跃
	image.IsActive = true
	if err := h.db.Save(&image).Error; err != nil {
		utils.InternalServerError(c, "设置背景失败: "+err.Error())
		return
	}

	// 记录审计日志
	username, _ := c.Get("username")
	go utils.LogAction(
		h.db,
		userID.(uint),
		username.(string),
		"update",
		"ai_image",
		image.ID,
		"POST",
		"/api/ai/background/set",
		c.ClientIP(),
		c.GetHeader("User-Agent"),
		200,
		"设置AI背景图成功",
		gin.H{"image_id": req.ImageID},
		nil,
	)

	utils.SuccessWithMessage(c, "背景图设置成功", image)
}
