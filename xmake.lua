set_project("lottie2img")
set_version("0.1.0")
set_xmakever("2.5.6")

add_rules("mode.debug", "mode.release")
set_policy("check.auto_ignore_flags", false)
add_requires("zlib ~1.2.12")
set_defaultplat("wasm")
set_languages("cxx17")

add_options("thread")
option("thread")
do
    set_default("mult")
    set_showmenu(true)
    set_description("Enable or disable thread support")
    if (get_config("thread") == "single") then
        add_ldflags("-sALLOW_MEMORY_GROWTH")
    else
        add_defines("HAVE_PTHREAD", "WEBP_USE_THREAD")
        add_cxflags("-pthread")
        add_ldflags("-pthread", "-sINITIAL_MEMORY=134217728") -- 128MB
    end
end
option_end()

-- keep assertions and disable optimisation in debug mode
if is_mode("debug") then
    add_cxflags("-O0", "-g")
    add_ldflags("-O0", "-g", "-sASSERTIONS", "-sNO_DISABLE_EXCEPTION_CATCHING")
else
    add_cxflags("-O3", "--closure=1")
    add_ldflags("-O3", "--closure=1", "-sNO_ASSERTIONS")
    add_defines("NDEBUG")
end

-- generate config.h
add_configfiles("core/xmake/config.h.in")
add_includedirs("$(buildir)")
set_configvar("MULT_THREAD", get_config("thread") == "mult")

set_configvar("RLOTTIE_VERSION", "0.2.0")
set_configvar("LOTTIE_CACHE", 0)
set_configvar("LOTTIE_MODULE", 0)
set_configvar("LOTTIE_THREAD", get_config("thread") == "mult")

-- build libwebp
target("libwebp")
do
    set_kind("static")
    add_files("core/third_party/libwebp/src/**.c")
    add_files("core/third_party/libwebp/sharpyuv/**.c")
    add_defines("HAVE_MALLOC_H")

    add_includedirs("core/third_party/libwebp")
    add_includedirs("core/third_party/libwebp/src", {
        public = true
    })
end

-- build rlottie
target("rlottie")
do
    set_kind("static")
    add_files("core/third_party/rlottie/src/lottie/**.cpp")
    add_files("core/third_party/rlottie/src/vector/**.cpp")

    add_includedirs("core/third_party/rlottie/src/vector")
    add_includedirs("core/third_party/rlottie/src/vector/freetype")
    add_includedirs("core/third_party/rlottie/src/vector/pixman")
    add_includedirs("core/third_party/rlottie/src/vector/stb")
    add_includedirs("core/third_party/rlottie/inc", {
        public = true
    })
end

-- build main
target("core")
do
    set_kind("binary")
    add_files("core/src/**.cpp")
    add_deps("libwebp", "rlottie")
    add_packages("zlib")
    add_ldflags("--post-js core/js/post.js", "-sEXIT_RUNTIME", "-sMODULARIZE", "-sEXPORT_NAME=createLottie2imgCore",
        "-sEXPORTED_FUNCTIONS=[_main,_convert,_version,_malloc,_free]",
        "-sEXPORTED_RUNTIME_METHODS=[ccall,getValue,AsciiToString]")
    if (is_config("thread", "single")) then
        set_filename("output/single-thread.js")
    else
        set_filename("output/mult-thread.js")
    end

    -- copy to dist/core
    after_build(function(target)
        if (not os.exists("$(projectdir)/dist/core")) then
            os.mkdir("$(projectdir)/dist/core")
        end
        os.cp(target:targetdir() .. "/output/*", "$(projectdir)/dist/core/")
    end)
end
