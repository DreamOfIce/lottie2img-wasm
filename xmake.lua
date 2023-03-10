set_project("lottie2img")
set_version("0.1.0")
set_xmakever("2.5.6")

add_rules("mode.debug", "mode.release")
set_policy("check.auto_ignore_flags", false)
add_requires("zlib ~1.2.12")
set_defaultplat("wasm")
set_languages("cxx17")

add_options("thread")

option("name")
do
    set_showmenu(true)
    set_description("Name of the core, used to copy the output to packages/core/packages/$name, left blank to not copied")
    set_values("core-mt", "core-st")
end

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
        add_ldflags("-pthread", "-sINITIAL_MEMORY=1073741824", "-sALLOW_TABLE_GROWTH") -- 1GB
    end
end
option_end()

-- keep assertions and disable optimisation in debug mode
if is_mode("debug") then
    add_cxflags("-O0", "-g")
    add_ldflags("-O0", "-g", "-sASSERTIONS", "-sNO_DISABLE_EXCEPTION_CATCHING",
        "-Wbad-function-cast -Wcast-function-type")
else
    add_cxflags("-O3", "--closure=1")
    add_ldflags("-O3", "--closure=1", "-sNO_ASSERTIONS")
    add_defines("NDEBUG")
end

-- generate config.h
add_configfiles("packages/core/xmake/config.h.in")
add_includedirs("$(buildir)")
set_configvar("LOTTIE2IMG_MULT_THREAD", get_config("thread") == "mult")

set_configvar("RLOTTIE_VERSION", "0.2.0")
set_configvar("LOTTIE_CACHE", 0)
set_configvar("LOTTIE_MODULE", 0)
set_configvar("LOTTIE_THREAD", get_config("thread") == "mult")

-- build gifencoder
target("gifencoder")
do
    set_kind("static")
    add_files("packages/core/third_party/gifencoder/egif/**.cpp")
    add_includedirs("packages/core/third_party/gifencoder/egif",{
        public = true
    })
end

-- build libwebp
target("libwebp")
do
    set_kind("static")
    add_files("packages/core/third_party/libwebp/src/**.c")
    add_files("packages/core/third_party/libwebp/sharpyuv/**.c")
    add_defines("HAVE_MALLOC_H")

    add_includedirs("packages/core/third_party/libwebp")
    add_includedirs("packages/core/third_party/libwebp/src", {
        public = true
    })
end

-- build rlottie
target("rlottie")
do
    set_kind("static")
    add_files("packages/core/third_party/rlottie/src/lottie/**.cpp")
    add_files("packages/core/third_party/rlottie/src/vector/**.cpp")

    add_includedirs("packages/core/third_party/rlottie/src/vector")
    add_includedirs("packages/core/third_party/rlottie/src/vector/freetype")
    add_includedirs("packages/core/third_party/rlottie/src/vector/pixman")
    add_includedirs("packages/core/third_party/rlottie/src/vector/stb")
    add_includedirs("packages/core/third_party/rlottie/inc", {
        public = true
    })
end

-- build main
target("core")
do
    set_kind("binary")
    add_files("packages/core/src/**.cpp")
    add_deps("gifencoder", "libwebp", "rlottie")
    set_filename("output/core.js")
    add_packages("zlib")
    add_links("embind")
    add_ldflags("--post-js packages/core/js/post.js", "-sEXIT_RUNTIME", "-sMODULARIZE", "-sEXPORT_NAME=createLottie2imgCore",
        "-sEXPORTED_RUNTIME_METHODS=[addFunction,UTF8ToString,ccall,cwrap,getValue]")
    if (is_config("thread", "single")) then
        add_ldflags("-sEXPORTED_FUNCTIONS=[_main,_free,_convert,_malloc,_version]")
    else
        add_ldflags("-sEXPORTED_FUNCTIONS=[_main,_free,_convert,_convertAsync,_malloc,_version]")
    end

    -- copy to package dist
    after_build(function(target)
        if (has_config("name")) then
            local package_dir = "packages/$(name)/dist"
            cprint("${blue}Copy result to " .. package_dir)
            if (not os.exists(package_dir)) then
                os.mkdir(package_dir)
            end
            os.cp(target:targetdir() .. "/output/*", "$(projectdir)/" .. package_dir)
        end
    end)
end
