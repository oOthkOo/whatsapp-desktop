#!/bin/bash

source ./scripts/constants.sh

rm -Rf $DIST_DIR/*
rm -Rf $OUTPUT_DIR/*
rm -Rf $RELEASES_DIR/*

mkdir -p $DIST_DIR
mkdir -p $OUTPUT_DIR
mkdir -p $RELEASES_DIR
