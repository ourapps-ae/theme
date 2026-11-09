"""Compile and run the Swift checks (macOS), type-check the SwiftUI sources against the iOS SDK, and compile the Kotlin sources.

Usage: python3 tests/native.py apple|android
"""
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
PURE_SWIFT = ["ThemeTypes.swift", "ThemeTokens.swift", "BackgroundMath.swift"]


def ios_flags():
    sdk = subprocess.run(["xcrun", "--sdk", "iphonesimulator", "--show-sdk-path"], capture_output=True, text=True, check=True).stdout.strip()
    return ["-sdk", sdk, "-target", "arm64-apple-ios17.0-simulator"]


def apple():
    sources = root / "implementation/apple/Sources"
    pure = [str(sources / name) for name in PURE_SWIFT]
    with tempfile.TemporaryDirectory() as directory:
        output = Path(directory) / "check"
        subprocess.run(["swiftc", *pure, str(root / "tests/apple/main.swift"), "-o", str(output)], check=True)
        subprocess.run([str(output)], cwd=root, check=True)
    # The view sources use UIKit and SwiftUI: type-check them with the pure sources for iOS.
    everything = sorted(str(p) for p in sources.glob("*.swift"))
    subprocess.run(["swiftc", "-typecheck", *ios_flags(), *everything], check=True)
    print("ios type-check passed")


def android():
    sources = sorted((root / "implementation/android/src/main/java").rglob("*.kt"))
    with tempfile.TemporaryDirectory() as directory:
        jar = str(Path(directory) / "check.jar")
        pure = [str(p) for p in sources if p.name in ("ThemeTypes.kt", "ThemeTokens.kt", "BackgroundMath.kt")]
        subprocess.run(["kotlinc", *pure, str(root / "tests/android/Main.kt"), "-include-runtime", "-d", jar], check=True)
        subprocess.run(["java", "-jar", jar], cwd=root, check=True)
        # Compose sources need the Android and Compose libraries on the classpath: compiled in the application build.


{"apple": apple, "android": android}.get(sys.argv[1], lambda: sys.exit("expected apple or android"))()
