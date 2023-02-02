#include "render.h"

uint8_t *render(std::string *lottieJson, renderOptions *options, size_t *outputLength)
{
  std::cout << "Initializing rlottie..." << std::endl;
  auto animation = rlottie::Animation::loadFromData(*lottieJson, "", "", false);

  double imgFrameRate = options->frameRate;
  int imgWidth = options->width;
  int imgHeight = options->height;
  double lottieFrameRate = animation->frameRate();
  size_t lottieWidth, lottieHeight;
  animation->size(lottieWidth, lottieHeight);
  double duration = animation->duration();
  if (imgWidth == NULL)
  {
    imgWidth = lottieWidth;
  }
  if (imgHeight == NULL)
  {
    imgHeight = lottieHeight;
  }
  if (imgFrameRate == NULL)
  {
    imgFrameRate = lottieFrameRate;
  }
  size_t imgTotalFrame = duration * imgFrameRate;

  std::cout << "===== Lottie Info =====" << std::endl;
  std::cout << "Default width: " << lottieWidth << std::endl;
  std::cout << "Default height: " << lottieHeight << std::endl;
  std::cout << "Frame Rate: " << lottieFrameRate << std::endl;

  std::cout << "===== Encode Options =====" << std::endl;
  std::cout << "Format: " << options->format << std::endl;
  std::cout << "Frame rate: " << imgFrameRate << std::endl;
  std::cout << "Minimaze output mode: " << options->minimizeSize << std::endl;
  std::cout << "Compress level: " << options->level << std::endl;
  std::cout << "Quality: " << options->quality << std::endl;
  std::cout << "Background color: #" << std::hex << std::setw(6) << std::setfill('0') << (options->backgroundColor & 0xFFFFFF) << std::setw(2) << (options->backgroundColor > 6) << std::setfill(' ') << std::dec << std::endl;

  std::cout << "===== Output Info =====" << std::endl;
  std::cout << "Width: " << imgWidth << std::endl;
  std::cout << "Height: " << imgHeight << std::endl;
  std::cout << "Duration: " << duration << std::endl;
  std::cout << "Loop: " << options->loop << std::endl;
  std::cout << "Total frames: " << imgTotalFrame << std::endl;

  std::cout << "Start encoding..." << std::endl;

  if (options->format == "webp")
  {
    // init encoder
    WebPAnimEncoderOptions encOptions;
    WebPAnimEncoderOptionsInit(&encOptions);
    WebPMuxAnimParams encParams;
    encParams.bgcolor = options->backgroundColor;
    encParams.loop_count = options->loop;
    encOptions.anim_params = encParams;
    encOptions.minimize_size = options->minimizeSize;
    WebPAnimEncoder *encoder = WebPAnimEncoderNew(imgWidth, imgHeight, &encOptions);

    WebPPicture pic;
    WebPPictureInit(&pic);

    // init config
    WebPConfig config;
    WebPConfigInit(&config);
    config.quality = options->quality;
    config.thread_level = MULT_THREAD;
    if (!WebPValidateConfig(&config))
    {
      std::cerr << "Invalid config" << std::endl;
      throw std::invalid_argument("Invalid config");
    }

    auto buffer = std::unique_ptr<uint32_t[]>(new uint32_t[imgHeight * imgWidth]);

    // add frames
    for (size_t i = 0; i < imgTotalFrame; i++)
    {
      // init picture
      pic.width = imgWidth;
      pic.height = imgHeight;
      pic.use_argb = true;
      pic.argb_stride = imgWidth;
      if (!WebPPictureAlloc(&pic))
      {
        std::cerr << "Error allocating memory for webp frame, make sure you have enough memory" << std::endl;
        throw std::runtime_error("Error allocating memory for webp frame, make sure you have enough memory");
      }
      // render lottie
      rlottie::Surface surface(buffer.get(), imgWidth, imgHeight, imgWidth * 4);
      animation->renderSync(animation->frameAtPos((double)i / (double)imgTotalFrame), surface);

      // add to encoder
      pic.argb = surface.buffer();
      if (!WebPAnimEncoderAdd(encoder, &pic, duration * 1000 / imgTotalFrame * i, &config))
      {
        WebPPictureFree(&pic);
        std::cerr << "Error adding frame No." << i << "(" << pic.error_code << std::endl;
        throw std::runtime_error("Error adding frame No." + std::to_string(i) + "(" + std::to_string(pic.error_code) + ")");
      }
    }
    WebPPictureFree(&pic);
    WebPAnimEncoderAdd(encoder, NULL, duration * 1000, NULL);

    // generate webp
    WebPData data;
    WebPDataInit(&data);
    if (WebPAnimEncoderAssemble(encoder, &data))
    {
      std::cout << "Encoded successfully, final size is " << data.size << "Bytes" << std::endl;
      WebPAnimEncoderDelete(encoder);
      uint8_t *ptr = (uint8_t *)malloc(data.size);
      memcpy(ptr, data.bytes, data.size);
      *outputLength = data.size;
      WebPDataClear(&data);
      return ptr;
    }
    else
    {
      std::string errDetail(WebPAnimEncoderGetError(encoder));
      WebPAnimEncoderDelete(encoder);
      WebPDataClear(&data);
      std::cerr << "Failed to encode webp: " << errDetail << std::endl;
      throw std::runtime_error("Failed to encode webp: " + errDetail);
    }
  }
  else
  {
    std::cerr << "Unknown output format " << options->format << std::endl;
    throw std::runtime_error("Unknown output format " + std::string(options->format));
  }
}