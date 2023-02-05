#pragma once
#include "config.h"
#include "encoder.h"
#include "../render.h"
#include "webp/encode.h"
#include "webp/mux.h"

class Lottie2imgWebPEncoder : public Lottie2imgEncoder
{
public:
  Lottie2imgWebPEncoder(renderOptions *options, size_t width, size_t height, double duration);
  ~Lottie2imgWebPEncoder();
  bool add(rlottie::Surface *surface, int timestamp);
  uint8_t *end(size_t *outputLength);

private:
  // output info
  double duration;

  // webp
  WebPConfig config;
  WebPData data;
  WebPAnimEncoder *encoder;
  WebPAnimEncoderOptions encOptions;
  WebPMuxAnimParams encParams;
  WebPPicture pic;
};