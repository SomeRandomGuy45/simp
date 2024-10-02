#ifndef GEN
#define GEN

#include <iostream>
#include <string>
#include <filesystem>
#include <fstream>
#include "toml.hpp"

namespace fs = std::filesystem;

// Function to get input from the user
std::string AskForInput(const std::string& prompt)
{
    std::string input;
    std::cout << prompt << ": ";
    std::getline(std::cin, input);
    return input;
}

// Function to create a new project
void CreateNewProject()
{
    toml::table project;
    toml::table config;
    toml::table build;
    std::string name = AskForInput("Enter project name");
    config.insert("name", name);
    fs::create_directories(name);
    fs::create_directories(name + "/src");
    build.insert("src_path", name + "/src");
    build.insert("install_script", name + "/build.sh");
    config.insert("version", AskForInput("Enter project version"));
    config.insert("authors", AskForInput("Enter project authors"));
    std::string fileType = AskForInput("Enter project language (c++ or simple) (default: c++) (more comming soon!)");
    fileType = fileType.empty() || fileType == "c++" || fileType == "simple" ?  "c++" : fileType;
    std::string path = name + "/src/main";
    path += (fileType == "c++" ? ".cpp" : ".simple");
    std::ofstream file(path);
    file.close();
    project.insert("config", config);
    project.insert("build", build);
    file.open(name + "/project.toml");
    file << project << std::endl;
    file.close();
    file.open(name + "/README.md");
    file.close();
    file.open(name + "/build.sh");
}
#endif
