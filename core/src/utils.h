#pragma once
#include <iostream>
#include <string>
#include "zlib.h"
#include "render.h"

/*
  Convert integer version number to a string in 'major.minor.patch' format
*/
std::string convertVersion(int version);

/*
  Check if the data is a gzip file
*/
bool isGzip(uint8_t *input, size_t inputLength);

/*
  Decompresses the data passed in by istream and returns the decompressed string
*/
std::string decompressGzip(uint8_t *input, size_t inputLength);

/*
  Parse arguments in key1=value1;key2=value2 format
*/
renderOptions parseArg(std::string argstr);