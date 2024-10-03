#ifndef GEN
#define GEN

#include <iostream>
#include <string>
#include <filesystem>
#include <fstream>
#include <curlpp/cURLpp.hpp>
#include <curlpp/Easy.hpp>
#include <curlpp/Options.hpp>
#include "toml.hpp"
#include "json.hpp"

bool findDataInURL(std::string LookFor)
{
    try {
        // Initialize curlpp
        curlpp::Cleanup cleaner;

        // Create a new curlpp Easy object
        curlpp::Easy request;

        // Set the URL for the GET request
        std::string url = "http://localhost:3000/api/getZipFiles/" + LookFor + ".zip";
        request.setOpt(curlpp::options::Url(url));

        // Set the HTTP header to accept JSON
        std::list<std::string> header;
        header.push_back("accept: application/json");
        request.setOpt(curlpp::options::HttpHeader(header));

        // Set up a string to capture the response
        std::stringstream response;
        request.setOpt(new curlpp::options::WriteStream( &response ));

        // Perform the request
        request.perform();
        
        if (response.str() != "File not found.")
        {
            nlohmann::json json = nlohmann::json::parse(response.str());
            if (json.find("file") != json.end())
            {
                if (json["file"] == "/api/download/"+LookFor + ".zip")
                {
                    std::cout << "Name already exists! Please rename project!\n";
                    return true;
                }
            }
        }
        return false;
    } catch (curlpp::RuntimeError &e) {
        std::cerr << "Curlpp Runtime Error: " << e.what() << std::endl;
        return false;
    } catch (curlpp::LogicError &e) {
        std::cerr << "Curlpp Logic Error: " << e.what() << std::endl;
        return false;
    }
}

// Function to get input from the user
std::string AskForInput(const std::string& prompt)
{
    std::string input;
    std::cout << prompt << ": ";
    std::getline(std::cin, input);
    return input;
}

// Function to create a new project
std::string CreateNewProject()
{
    toml::table project;
    toml::table config;
    toml::table build;
    std::string name;
    while (true)
    {
        name = AskForInput("Enter project name");
        if (!findDataInURL(name)) break;
    }
    config.insert("name", name);
    std::filesystem::create_directories(name);
    std::filesystem::create_directories(name + "/src");
    build.insert("src_path", name + "/src");
    build.insert("install_script", name + "/build.sh");
    config.insert("version", AskForInput("Enter project version"));
    config.insert("authors", AskForInput("Enter project authors"));
    std::string fileType = AskForInput("Enter project language (c++ or simple) (default: c++) (more comming soon!)");
    if ((fileType != "c++" && fileType != "simple") || fileType.empty())
    {
        fileType = "c++";
    }
    std::string path = name + "/src/main";
    path += (fileType == "c++" ? ".cpp" : ".simple");
    std::ofstream file(path);
    if (fileType == "c++")
    {
        file << R"(#include "main_lib.h"
#include <iostream>

open DLLEXPORT std::string helper print(const std::vector<std::string>& args) {
    if (args.size() > 0) {
        std::cout << args[0] << std::endl;
        return "Printed";
    }
    return "NoArgs";
}

open DLLEXPORT std::string helper add(const std::vector<std::string>& args) {
    if (args.size() > 1) {
        int a = std::stoi(args[0]);
        int b = std::stoi(args[1]);
        int result = a + b;
        return std::to_string(result);
    }
    return "InvalidArgs";
}

open DLLEXPORT std::vector<std::string> helper listFunctions() {
    return {std::string("print"), std::string("add")};
}

open DLLEXPORT FunctionPtr helper getFunction(const char* name) {
    if (std::string(name) == "print") {
        return &print;
    } else if (std::string(name) == "add") {
        return &add;
    }
    return nullptr;
}
        )";
        file.close();
        std::string path = name + "/src/main_lib";
        path += (fileType == "c++" ? ".h" : ".simple");
        file.open(path);
        file << R"(#ifndef MAIN_LIB_H
#define MAIN_LIB_H

#include <string>
#include <vector>

// Define DLLEXPORT for Windows, leave as empty for other OS's
#define open extern "C"
#ifdef _WIN32
    #define DLLEXPORT __declspec(dllexport)
    #define helper __stdcall
#else
    #define DLLEXPORT __attribute__((visibility("default")))
    #define helper
#endif

// Function pointer type for library functions
typedef std::string (*FunctionPtr)(const std::vector<std::string>& args);

// Function declarations with DLLEXPORT
open DLLEXPORT std::string helper print(const std::vector<std::string>& args);
open DLLEXPORT std::string helper add(const std::vector<std::string>& args);

// Function to list all available functions in the library
open DLLEXPORT std::vector<std::string> helper listFunctions();

// Function to get a function pointer by name
open DLLEXPORT FunctionPtr helper getFunction(const char* name);

#endif // MAIN_LIB_H
        )";
    }
    file.close();
    project.insert("config", config);
    project.insert("build", build);
    file.open(name + "/project.toml");
    file << project << std::endl;
    file.close();
    file.open(name + "/README.md");
    file.close();
    file.open(name + "/Makefile");
    file << R"(# Define the target
TARGET = libmain_lib
SRCS = main.cpp
HEADERS = main_lib.h

# Define the platform
UNAME_S := $(shell uname -s)

# Compiler settings
CXX = g++
CXXFLAGS = -shared -fPIC -Wall -Wextra -I. --std=c++20

# Platform-specific settings
ifeq ($(UNAME_S), Darwin)  # macOS
    TARGET_LIB = $(TARGET).dylib
    CXXFLAGS += -fvisibility=default -dynamiclib
    LDFLAGS = -install_name @rpath/$(TARGET_LIB)
else ifeq ($(UNAME_S), Linux)  # Linux
    TARGET_LIB = lib$(TARGET).so
else  # Assuming Windows (requires MinGW or similar)
    TARGET_LIB = $(TARGET).dll
    CXX = x86_64-w64-mingw32-g++
    CXXFLAGS = -shared -Wall -Wextra -I.
endif

# Build target
all: $(TARGET_LIB)

$(TARGET_LIB): $(SRCS) $(HEADERS)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET_LIB) $(LDFLAGS)

# Clean up
clean:
	rm -f *.o *.so *.dylib *.dll
    )";
    file.close();
    file.open(name + "/build.sh");
    file << R"(make)";
    file.close();
    return name;
}
#endif
