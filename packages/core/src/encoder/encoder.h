#pragma once
#include "rlottie.h"

class Lottie2imgEncoder
{
public:
  virtual ~Lottie2imgEncoder(){};
  virtual bool add(rlottie::Surface *surface, int timestamp) = 0;
  virtual uint8_t *end(size_t *outputLength) = 0;
};