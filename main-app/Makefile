CC = g++
CFLAGS = --std=c++20 -lcurl -lcurlpp
TARGET = simp
SOURCES = main.cpp

# Default rule
all: $(TARGET)

# Compile the main program
$(TARGET): $(SOURCES)
	$(CC) $(SOURCES) -o $(TARGET) $(CFLAGS)

# Clean rule to remove the binary and other generated files
clean:
	rm -f $(TARGET)
