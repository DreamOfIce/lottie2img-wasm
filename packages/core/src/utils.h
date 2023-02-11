#pragma once
#include <string>
#include "zlib.h"
#include "render.h"

/**
  @brief Convert integer version number to a string in 'major.minor.patch' format
  @param[in] version
*/
std::string convertVersion(int version);

/**
  @brief Write error message to memory
  @note alternative to wasm exception before it was widely supported
  @todo switch to native wasm exception
*/
void writeError(char **errorPtr, std::string message);

/**
  @brief Check if the data is a gzip file
  @param[in] input pointer to the data for check
  @param[in] inputLength length of the data
  @return true if the data is a gzip file, false otherwise
*/
bool isGzip(uint8_t *input, size_t inputLength);

/**
  @brief Decompresses gzip data
  @param[in] input pointer to the bytes for decompression
  @param[in] inputLength length of the input
  @param[out] errorString point to a pointer of a string with error message
  @return decompressed string
*/
std::string decompressGzip(uint8_t *input, size_t inputLength, char **errorPtr);

/**
  @brief Parse arguments to lottie2img renderOptions
  @param[in] args arguments string in key=value format, split with ';'
  @return a renderOptions struct
*/
renderOptions parseArg(std::string argstr, char **errorPtr);