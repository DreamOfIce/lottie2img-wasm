#include "webp.h"
#include <iostream>

Lottie2imgWebPEncoder::Lottie2imgWebPEncoder(renderOptions *options, size_t width, size_t height, double duration)
{
  // Init WebP encoder
  WebPAnimEncoderOptionsInit(&encOptions);
  encParams.bgcolor = options->backgroundColor >> 2 | (options->backgroundColor & 0xFF) << 6;
  encParams.loop_count = options->loop;
  encOptions.anim_params = encParams;
  encOptions.minimize_size = options->minimizeSize;
  encoder = WebPAnimEncoderNew(width, height, &encOptions);

  // Init WebP config
  WebPConfigInit(&config);
  config.quality = options->quality;
  config.thread_level = LOTTIE2IMG_MULT_THREAD;
  if (!WebPValidateConfig(&config))
  {
    std::cerr << "Invalid WebP config" << std::endl;
    throw std::invalid_argument("Invalid WebP config");
  }

  // Init WebP picture
  WebPPictureInit(&pic);
  pic.width = width;
  pic.height = height;
  pic.use_argb = true;
  pic.argb_stride = width;

  WebPDataInit(&data);

  this->duration = duration;
}

Lottie2imgWebPEncoder::~Lottie2imgWebPEncoder()
{
  WebPAnimEncoderDelete(encoder);
  WebPDataClear(&data);
  WebPPictureFree(&pic);
}

bool Lottie2imgWebPEncoder::add(rlottie::Surface *surface, int timestamp)
{
  if (!WebPPictureAlloc(&pic))
  {
    std::cerr << "Error allocating memory for webp frame, make sure you have enough memory" << std::endl;
    return false;
  }

  // add to encoder
  pic.argb = surface->buffer();
  if (!WebPAnimEncoderAdd(encoder, &pic, timestamp, &config))
  {
    WebPPictureFree(&pic);
    std::cerr << "Error adding frame(" << pic.error_code << ")" << std::endl;
    return false;
  }
  WebPPictureFree(&pic);
  return true;
}

uint8_t *Lottie2imgWebPEncoder::end(size_t *outputLength)
{
  WebPAnimEncoderAdd(encoder, NULL, duration, NULL);

  if (WebPAnimEncoderAssemble(encoder, &data))
  {
    std::cout << "Encoded successfully, final size is " << data.size << "Bytes" << std::endl;
    auto result = (uint8_t *)malloc(data.size);
    memcpy(result, data.bytes, data.size);
    *outputLength = data.size;
    WebPDataClear(&data);
    return result;
  }
  else
  {
    std::string errDetail(WebPAnimEncoderGetError(encoder));
    std::cerr << "Failed to encode webp: " << errDetail << std::endl;
    return 0;
  }
}