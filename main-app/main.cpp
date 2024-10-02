#include "generator.h"

int main(int argc, char **argv)
{
    if (argc > 1)
    {
        std::string command(argv[1]);
        if (command == "init" || command == "create" || command == "innit")
        {
            CreateNewProject();
        }
    }
    return 0;
}