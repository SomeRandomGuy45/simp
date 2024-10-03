#include "generator.h"
#include "upload.h"

int main(int argc, char **argv)
{
    if (argc > 1)
    {
        std::string command(argv[1]);
        if (command == "init" || command == "create" || command == "innit")
        {
            std::string newProject = CreateNewProject();
            UploadZip(newProject);
        }
        else if (command == "publish")
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
    std::cout << " publish: Publish the current project" << std::endl;
    return 0;
}