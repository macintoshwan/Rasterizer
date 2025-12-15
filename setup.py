from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="rasterizer",
    version="0.1.0",
    author="macintoshwan",
    author_email="69745614+macintoshwan@users.noreply.github.com",
    description="A library for rasterizing vector data for machine learning training",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/macintoshwan/Rasterizer",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Scientific/Engineering :: Image Processing",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
    python_requires=">=3.7",
    install_requires=[
        "numpy>=1.19.0",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-cov>=2.0",
        ],
        "ml": [
            "tensorflow>=2.0.0",
            "scikit-learn>=0.24.0",
        ],
    },
)
