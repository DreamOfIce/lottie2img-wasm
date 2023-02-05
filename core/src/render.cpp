#include "render.h"
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>
#include "encoder/encoder.h"
#include "encoder/webp.h"
#include "webp/encode.h"
#include "webp/mux.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#endif

/*
  Binding for JavaScript
*/
#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(lottie2img)
{
  emscripten::enum_<outputFormat>("outputFormat")
      .value("webp", FORMAT_WEBP)
      //.value("gif", FORMAT_GIF)
      ;
}
#endif

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
  std::cout << "Minimaze output mode: " << std::boolalpha << options->minimizeSize << std::noboolalpha << std::endl;
  std::cout << "Compress level: " << options->level << std::endl;
  std::cout << "Quality: " << options->quality << std::endl;
  std::cout << "Background color: #" << std::hex << std::setw(8) << std::setfill('0') << options->backgroundColor << std::setfill(' ') << std::dec << std::endl;

  std::cout << "===== Output Info =====" << std::endl;
  std::cout << "Width: " << imgWidth << std::endl;
  std::cout << "Height: " << imgHeight << std::endl;
  std::cout << "Duration: " << std::fixed << std::setprecision(2) << duration << std::defaultfloat << std::setprecision(6) << std::endl;
  std::cout << "Loop: " << options->loop << std::endl;
  std::cout << "Total frames: " << imgTotalFrame << std::endl;

  std::cout << "Start encoding..." << std::endl;

  std::unique_ptr<Lottie2imgEncoder> encoder;
  switch (options->format)
  {
  case FORMAT_WEBP:
    encoder = std::unique_ptr<Lottie2imgEncoder>(new Lottie2imgWebPEncoder(options, imgWidth, imgHeight, duration));
    break;
  default:
    std::cerr << "Unknown output format " << options->format << std::endl;
    return 0;
  }

  auto buffer = std::unique_ptr<uint32_t[]>(new uint32_t[imgHeight * imgWidth]);
  rlottie::Surface surface(buffer.get(), imgWidth, imgHeight, imgWidth * 4);

  // add frames
  for (size_t i = 0; i < imgTotalFrame; i++)
  {
    // render lottie
    animation->renderSync(animation->frameAtPos((double)i / (double)imgTotalFrame), surface);

    // add to encoder
    if (!encoder->add(&surface, duration * 1000 / imgTotalFrame * i))
    {
      return 0;
    }
  }

  // generate image
  return encoder->end(outputLength);
}