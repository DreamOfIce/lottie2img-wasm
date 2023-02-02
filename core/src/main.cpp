#include <iostream>
#include <string>
#include "zlib.h"
#include "webp/encode.h"
#include "webp/mux.h"
#include "config.h"
#include "utils.h"
#include "render.h"
using namespace std;

int main(int argc, char **argv)
{
  cout << "lottie2img-core v" << PROJECT_VERSION << endl;
  return 0;
}

extern "C" uint8_t *convert(char *args, uint8_t *input, size_t inputLength, size_t *outputLength)
{
  renderOptions options = parseArg(std::string(args));
  string json;
  if (isGzip(input, inputLength))
  {
    cout << "Gzip header detected, extract first..." << endl;
    json = decompressGzip(input, inputLength);
  }
  else
  {
    json = string((const char *)input, inputLength);
  }
  return render(&json, &options, outputLength);
}

/*
  Print version info in JSON format
*/
extern "C" const char *version()
{
  static string json;
  if (json.empty())
  {
    json += '{';
    json = json + "\"core\":\"" + PROJECT_VERSION + "\",";
    json = json + "\"emscripten\":\"" + __VERSION__ + "\",";
    json = json + "\"libwebp\":\"" + convertVersion(WebPGetEncoderVersion()) + "\",";
    json = json + "\"rlottie\":\"" + RLOTTIE_VERSION + "\",";
    json = json + "\"zlib\":\"" + ZLIB_VERSION + "\"";
    json += '}';
  }
  return json.data();
}