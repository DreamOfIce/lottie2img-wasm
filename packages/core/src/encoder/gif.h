#pragma once
#include "config.h"
#include "encoder.h"
#include "../render.h"
#include "GifEncoder.h"

class Lottie2imgGifEncoder : public Lottie2imgEncoder
{
public:
  Lottie2imgGifEncoder(renderOptions *options, size_t width, size_t height, double duration, size_t totalFrames = 0);
  ~Lottie2imgGifEncoder() = default;
  bool add(rlottie::Surface *surface, int timestamp);
  uint8_t *end(size_t *outputLength);

private:
  // output info
  size_t width;
  size_t height;
  uint8_t backgroundColor[3];
  int currentFrame = 1;
  double timePerFrame;
  uint8_t *resultPtr = nullptr;
  size_t resultLength = 0;

  // gif
  GifEncoder encoder{};
};