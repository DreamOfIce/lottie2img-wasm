#pragma once
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>
#include "rlottie.h"
#include "webp/encode.h"
#include "webp/mux.h"
#include "config.h"

/*
  Structure of configs
*/
struct renderOptions
{
  std::string format = "webp";    // output format, currently only support webp
  double frameRate = NULL;        // frames per second(will be ignored if bigger than origin lottie's)
  int width = NULL;               // width of image in px
  int height = NULL;              // height of image in px
  int loop = 0;                   // Number of times to repeat the animation [0 = infinite]
  uint32_t backgroundColor = 0x0; // Background color in ARGB format
  bool minimizeSize = false;      // If true, minimize the output size (slow). Implicitly disables key-frame insertion.
  double quality = 75;            // a number between 0(worst) and 100(best)
  int level = 4;                  // quality/speed trade-off (0=fast, 6=slower-better)
};

/*
  render lottie json to webp
*/
uint8_t *render(std::string *lottieJson, renderOptions *options, size_t *outputLength);
