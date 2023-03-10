#include <emscripten/bind.h>
#include <iostream>
#include <string>
#include <cstring>
#include "zlib.h"
#include "webp/encode.h"
#include "webp/mux.h"
#include "config.h"
#include "utils.h"
#include "render.h"

#ifdef LOTTIE2IMG_ASYNC
#include <functional>
#include <thread>
#include <emscripten.h>
#include <emscripten/proxying.h>
emscripten::ProxyingQueue queue;
EMSCRIPTEN_BINDINGS(lottie2img)
{
  emscripten::constant("haveAsync", true);
}
#else
EMSCRIPTEN_BINDINGS(lottie2img)
{
  emscripten::constant("haveAsync", false);
}
#endif

using namespace std;

extern "C"
{
  int main(int argc, char **argv)
  {
    cout << "lottie2img-core v" << LOTTIE2IMG_VERSION << endl;
    cout << "mult thread: " << boolalpha << LOTTIE2IMG_MULT_THREAD << endl;
    cout << "WebP format support: " << LOTTIE2IMG_FORMAT_WEBP << endl;
    cout << "GIF format support: " << LOTTIE2IMG_FORMAT_GIF << endl;
    cout << noboolalpha << endl;
    return 0;
  }

  /**
    @brief Convert lottie to image
    @param[in] args arguments string in key=value format, split with ';'
    @param[in] input lottie/tgs input
    @param[in] inputLength length of input
    @param[out] outputLength length of output
    @param[out] errorString point to a pointer of a string with error message
    @return pointer to the image, or 0 for failure
  */
  uint8_t *convert(char *args, uint8_t *input, size_t inputLength, size_t *outputLength, char **errorPtr)
  {
    cout << args << endl;
    renderOptions options = parseArg(std::string(args), errorPtr);
    if (*errorPtr != nullptr)
      return 0;
    string json;
    if (isGzip(input, inputLength))
    {
      cout << "Gzip header detected, extract first..." << endl;
      json = decompressGzip(input, inputLength, errorPtr);
      if (*errorPtr != nullptr)
        return 0;
    }
    else
    {
      json = string((const char *)input, inputLength);
    }
    return render(&json, &options, outputLength, errorPtr);
  }

#ifdef LOTTIE2IMG_ASYNC
  /**
    @brief Async version of convert()
    @param[in] args arguments string in key=value format, split with ';'
    @param[in] input lottie/tgs input
    @param[in] inputLength length of input
    @param[out] outputLength length of output
    @param[out] errorString point to a pointer of a string with error message
    @param[in] callback  callback function runs when convert complete
    @return return true if the initial work was successfully enqueued and the target thread notified or false otherwise
  */
  bool convertAsync(char *args, uint8_t *input, size_t inputLength, size_t *outputLength, void (*callback)(void *), char **errorPtr)
  {
    atomic<bool> start{false};
    thread taskThread([&]()
                      { 
                        while (!start)
                          sched_yield();
                        queue.execute(); });
    auto result = queue.proxyAsyncWithCallback(taskThread.native_handle(), bind(&convert, args, input, inputLength, outputLength, errorPtr), callback);
    start = true;
    taskThread.detach();
    return result;
  }
#endif

  /**
    @brief Print version info in JSON format
    @note Don't free the memory returned by this function
    @return pointer of versions info in JSON format
  */
  const char *version()
  {
    string json;
    json += '{';
    json = json + "\"core\":\"" + LOTTIE2IMG_VERSION + "\",";
    json = json + "\"emscripten\":\"" + __VERSION__ + "\",";
    json = json + "\"libwebp\":\"" + convertVersion(WebPGetEncoderVersion()) + "\",";
    json = json + "\"rlottie\":\"" + RLOTTIE_VERSION + "\",";
    json = json + "\"zlib\":\"" + ZLIB_VERSION + "\"";
    json += '}';
    auto ptr = malloc(json.size() + 1);
    memcpy(ptr, json.data(), json.size() + 1);
    return (char *)ptr;
  }
}