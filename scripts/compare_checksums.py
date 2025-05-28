#!/usr/bin/env python3

import os
import sys
import hashlib
import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple

def calculate_file_checksum(file_path: str) -> str:
    """Calculate SHA-256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash in chunks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def get_all_files(directory: str) -> List[str]:
    """Get all files in a directory recursively."""
    all_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            all_files.append(os.path.join(root, file))
    return all_files

def get_relative_path(file_path: str, base_dir: str) -> str:
    """Get the path of a file relative to a base directory."""
    return os.path.relpath(file_path, base_dir)

def find_builds(dist_record_dir: str, version: str) -> List[str]:
    """Find all builds for a specific version."""
    version_dir = os.path.join(dist_record_dir, version)
    if not os.path.exists(version_dir):
        print(f"No builds found for version {version}")
        return []
    
    builds = []
    for item in os.listdir(version_dir):
        if item.startswith("build-"):
            builds.append(os.path.join(version_dir, item))
    
    return sorted(builds)

def compare_checksums(builds: List[str]) -> Tuple[Dict, Dict]:
    """Compare checksums across builds."""
    # Dictionary to store checksums for each file in each build
    # {relative_file_path: {build_number: checksum}}
    checksums = defaultdict(dict)
    
    # Dictionary to store file sizes for each file in each build
    # {relative_file_path: {build_number: size}}
    file_sizes = defaultdict(dict)
    
    # Process each build
    for build_path in builds:
        build_number = os.path.basename(build_path).replace("build-", "")
        
        # Process dist-firefox directory
        dist_firefox_dir = os.path.join(build_path, "dist-firefox")
        if os.path.exists(dist_firefox_dir):
            for file_path in get_all_files(dist_firefox_dir):
                rel_path = get_relative_path(file_path, build_path)
                checksums[rel_path][build_number] = calculate_file_checksum(file_path)
                file_sizes[rel_path][build_number] = os.path.getsize(file_path)
                
        # Process dist-chrome directory
        dist_chrome_dir = os.path.join(build_path, "dist-chrome")
        if os.path.exists(dist_chrome_dir):
            for file_path in get_all_files(dist_chrome_dir):
                rel_path = get_relative_path(file_path, build_path)
                checksums[rel_path][build_number] = calculate_file_checksum(file_path)
                file_sizes[rel_path][build_number] = os.path.getsize(file_path)
        
        # Process dist-zip directory
        dist_zip_dir = os.path.join(build_path, "dist-zip")
        if os.path.exists(dist_zip_dir):
            for file_path in get_all_files(dist_zip_dir):
                rel_path = get_relative_path(file_path, build_path)
                checksums[rel_path][build_number] = calculate_file_checksum(file_path)
                file_sizes[rel_path][build_number] = os.path.getsize(file_path)
    
    return checksums, file_sizes

def find_inconsistencies(checksums: Dict, file_sizes: Dict) -> Tuple[Dict, Dict, Dict]:
    """Find files with inconsistent checksums across builds."""
    inconsistent_files = {}
    missing_files = {}
    size_differences = {}
    
    # Precompute all build numbers
    all_build_numbers = set(build_number for checksums_dict in checksums.values() for build_number in checksums_dict.keys())
    
    for file_path, build_checksums in checksums.items():
        # Check if file exists in all builds
        build_numbers = list(build_checksums.keys())
        
        if len(build_numbers) < len(all_build_numbers):
            missing_in_builds = all_build_numbers - set(build_numbers)
            missing_files[file_path] = sorted(missing_in_builds)
        
        # Check if checksums are consistent across builds
        unique_checksums = set(build_checksums.values())
        if len(unique_checksums) > 1:
            inconsistent_files[file_path] = build_checksums
            
            # Check if size is different
            file_build_sizes = file_sizes[file_path]
            unique_sizes = set(file_build_sizes.values())
            if len(unique_sizes) > 1:
                size_differences[file_path] = file_build_sizes
    
    return inconsistent_files, missing_files, size_differences

def generate_report(
    inconsistent_files: Dict, 
    missing_files: Dict, 
    size_differences: Dict, 
    builds: List[str],
    output_file: str = None
) -> None:
    """Generate a report of inconsistencies."""
    build_numbers = [os.path.basename(build).replace("build-", "") for build in builds]
    
    report = {
        "builds_analyzed": build_numbers,
        "total_builds": len(build_numbers),
        "inconsistent_files": {
            "count": len(inconsistent_files),
            "files": {file_path: checksums for file_path, checksums in inconsistent_files.items()}
        },
        "missing_files": {
            "count": len(missing_files),
            "files": {file_path: missing_builds for file_path, missing_builds in missing_files.items()}
        },
        "size_differences": {
            "count": len(size_differences),
            "files": {file_path: sizes for file_path, sizes in size_differences.items()}
        }
    }
    
    # Print summary to console
    print(f"\nChecksum Comparison Report")
    print(f"========================")
    print(f"Builds analyzed: {', '.join(build_numbers)}")
    print(f"Total builds: {len(build_numbers)}")
    print(f"Files with inconsistent checksums: {len(inconsistent_files)}")
    print(f"Files missing in some builds: {len(missing_files)}")
    print(f"Files with size differences: {len(size_differences)}")
    
    # Print details of inconsistent files
    if inconsistent_files:
        print("\nInconsistent Files:")
        for file_path, checksums in inconsistent_files.items():
            print(f"\n  {file_path}:")
            for build, checksum in checksums.items():
                print(f"    Build {build}: {checksum}")
    
    # Write report to file if specified
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\nDetailed report saved to {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Compare checksums across builds of the same version")
    parser.add_argument("version", help="Version to compare builds for")
    parser.add_argument("--dist-record", default="../dist-record", help="Path to dist-record directory")
    parser.add_argument("--output", help="Output file for detailed report (JSON format)")
    
    args = parser.parse_args()
    
    # Resolve paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dist_record_dir = os.path.abspath(os.path.join(script_dir, args.dist_record))
    
    # Find builds for the specified version
    builds = find_builds(dist_record_dir, args.version)
    if not builds:
        sys.exit(1)
    
    print(f"Found {len(builds)} builds for version {args.version}")
    for build in builds:
        print(f"  - {os.path.basename(build)}")
    
    # Compare checksums
    print("\nCalculating checksums...")
    checksums, file_sizes = compare_checksums(builds)
    
    # Find inconsistencies
    print("Finding inconsistencies...")
    inconsistent_files, missing_files, size_differences = find_inconsistencies(checksums, file_sizes)
    
    # Generate report
    output_file = args.output
    if output_file and not os.path.isabs(output_file):
        output_file = os.path.abspath(os.path.join(os.getcwd(), output_file))
    
    generate_report(inconsistent_files, missing_files, size_differences, builds, output_file)

if __name__ == "__main__":
    main()