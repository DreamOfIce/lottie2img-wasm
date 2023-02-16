#pragma once
#include "rlottie.h"

class Lottie2imgEncoder
{
public:
  virtual ~Lottie2imgEncoder(){};
  /**
   * @brief add a frame to the encoder
   * @param[in] surface surface to add
   * @param[in] timestamp timestamp(ms)
   * @return true if added successfully
   */
  virtual bool add(rlottie::Surface *surface, int timestamp) = 0;
  /**
   * @brief encode and return image
   * @param[out] outputLength length of the output
   * @return image data
   */
  virtual uint8_t *end(size_t *outputLength) = 0;
};