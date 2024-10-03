#ifndef UPLOAD
#define UPLOAD

#include <iostream>
#include <string>
#include <fstream>
#include <sstream>
#include <filesystem>
#ifdef _WIN32
#include <cstdlib>
#else
#include <unistd.h>
#endif
#include "toml.hpp"

void zipFolder(const std::string& zipFilePath, const std::string& folderPath) {
    // Check if the folder exists
    if (!std::filesystem::exists(folderPath)) {
        std::cerr << "The specified folder does not exist: " << folderPath << std::endl;
        return;
    }

    std::string command;

#ifdef _WIN32
    // Check if the ZIP file already exists
    if (std::filesystem::exists(zipFilePath)) {
        // If the zip file exists, update it
        command = "powershell -command \"Compress-Archive -Update -Force -Path '" + folderPath + "' -DestinationPath '" + zipFilePath + "'\"";
    } else {
        // If the zip file does not exist, create it
        command = "powershell -command \"Compress-Archive -Path '" + folderPath + "' -DestinationPath '" + zipFilePath + "'\"";
    }
#else
    // For macOS and Linux, use the zip command
    command = "zip -r \"" + zipFilePath + "\" \"" + folderPath + "\"";
#endif

    // Execute the command
    int result = system(command.c_str());
    system(command.c_str());
}

void uploadFile(const std::string& host, const std::string& port, const std::string& target, const std::string& filePath) {
    // Construct the curl command as a string
    std::string command = "curl -X POST " \
                          + host + ":" + port + target + " " \
                          "-H \"accept: */*\" " \
                          "-H \"Content-Type: multipart/form-data\" " \
                          "-F \"file=@" + filePath + ";type=application/x-zip-compressed\"";

    // Execute the curl command
    std::system(command.c_str());
}

void UploadZip(const std::string& folderPath) {
    std::ifstream f(folderPath + "/project.toml");
    if (!f.is_open()) {
        std::cerr << "Could not open the file: " << folderPath << std::endl;
        return;
    }

    std::stringstream buffer;
    buffer << f.rdbuf(); // Read the entire file into a stringstream
    std::string data = buffer.str();
    f.close();

    std::string projectName;
    try {
        toml::table tbl = toml::parse(data);

        // Check if the "name" key exists and is a string
        auto nameOpt = tbl["config"]["name"].value<std::string>();
        if (nameOpt) {
            projectName = *nameOpt;
        } else {
            std::cerr << "Error: 'name' key not found in config or is not a string." << std::endl;
        }
    } catch (const toml::parse_error& err) {
        std::cerr << "TOML parsing error: " << err.what() << std::endl;
        return;
    } catch (const std::bad_alloc& e) {
        std::cerr << "Memory allocation error: " << e.what() << std::endl;
        return;
    }
    projectName += ".zip";

    std::string zipFilePath = std::filesystem::temp_directory_path().string() + projectName;
    zipFolder(zipFilePath, folderPath);

    uploadFile("http://localhost", "3000", "/api/uploadData", zipFilePath);
}

#endif