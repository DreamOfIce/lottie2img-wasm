#include "gif.h"
#include <algorithm>
#include <cstring>
#include <cassert>
#include <iostream>

Lottie2imgGifEncoder::Lottie2imgGifEncoder(renderOptions *options, size_t width, size_t height, double duration, size_t totalFrames)
{
  if (!encoder.open(&(this->resultPtr), &resultLength, width, height, std::max(1, (int)(30 - options->quality * 0.3)), true, options->loop, width * height * 3 * totalFrames))
  {
    std::cerr << "Error opening gif encoder" << std::endl;
    throw std::runtime_error("Error opening gif encoder");
  }

  this->width = width;
  this->height = height;
  memcpy(this->backgroundColor, &(options->backgroundColor), 3);
  this->timePerFrame = duration * 100 / totalFrames;
}

bool Lottie2imgGifEncoder::add(rlottie::Surface *surface, int timestamp)
{
  size_t frameSize = width * height * 3;
  std::unique_ptr<uint8_t[]> frame(new uint8_t[frameSize]);
  auto dest = frame.get();
  auto src = (uint8_t *)surface->buffer();
  for (const uint8_t *dstEnd = dest + frameSize; dest < dstEnd; src += 4)
  {
    double alpha = *(src + 3) / 255.0;
    if (alpha == 1)
    {
      *(dest++) = *src;
      *(dest++) = *(src + 1);
      *(dest++) = *(src + 2);
    }
    else if (alpha == 0)
    {
      memcpy(dest, this->backgroundColor, 3);
      dest += 3;
    }
    else
    {
      double alpha2 = 1 - alpha;
      *(dest++) = *src * alpha + this->backgroundColor[0] * alpha2;
      *(dest++) = *(src + 1) * alpha + this->backgroundColor[1] * alpha2;
      *(dest++) = *(src + 2) * alpha + this->backgroundColor[2] * alpha2;
    }
  }
  if (!encoder.push(GifEncoder::PIXEL_FORMAT_BGR, frame.get(), width, height, (int)(timePerFrame * currentFrame) - (int)(timePerFrame * (currentFrame - 1))))
  {
    std::cerr << "Error adding frame" << std::endl;
    return false;
  }
  ++currentFrame;
  return true;
}

uint8_t *Lottie2imgGifEncoder::end(size_t *outputLength)
{
  if (!encoder.close())
  {
    std::cerr << "Failed to encode gif" << std::endl;
    return 0;
  }
  std::cout << "Encoded successfully, final size is " << this->resultLength << "Bytes" << std::endl;

  *outputLength = this->resultLength;
  return this->resultPtr;
}