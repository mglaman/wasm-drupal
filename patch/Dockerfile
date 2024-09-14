FROM emscripten/emsdk:3.1.35 as build_tool

RUN apt-get update && \
  apt-get --no-install-recommends -y install \
    build-essential \
    automake \
    autoconf \
    libtool \
    pkgconf \
    python3 \
    bison \
    flex \
    make \
    re2c \
    gdb \
    git \
    libxml2 \
    libxml2-dev \
    pv \
    re2c

FROM build_tool AS patch
ARG PATCH_TAG=v2.7.6
RUN git clone https://git.savannah.gnu.org/git/patch.git patch \
		--branch "$PATCH_TAG" \
		--depth 1 \
        --recurse-submodules \
        --shallow-submodules
WORKDIR /src/patch
RUN ./bootstrap
RUN emconfigure ./configure
RUN emmake make
