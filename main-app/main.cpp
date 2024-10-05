#include "generator.h"
#include "upload.h"
#include <vector>

std::vector<std::string> args;

int main(int argc, char **argv)
{
    for (int i = 0; i < argc; i++)
    {
        args.push_back(argv[i]);
    }
    if (argc > 1)
    {
        std::string command(argv[1]); 
        if (command == "init" || command == "create" || command == "innit")
        {
            std::string newProject = CreateNewProject();
            UploadZip(newProject);
        }
        else if (command == "publish" || command == "update" || command == "upd")
        {
            if (!std::filesystem::exists(std::filesystem::current_path().string() + "/project.toml")) return 0;
            UploadZip(std::filesystem::current_path().string());
        }
        return 0;
    }
    std::cout << "simp: Simple package" << std::endl;
    std::cout << "Usage: simp [command] [options]" << std::endl;
    std::cout << "Commands:" << std::endl;
    std::cout << " init, create, innit: Create's a new project" << std::endl;
    std::cout << " publish, upd, update: Publish or updates the current project" << std::endl;
    return 0;
}