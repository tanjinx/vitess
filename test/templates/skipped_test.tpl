name: {{.Name}}
on: 
    push:
        paths:
            - '**.md'
    pull_request:
        paths:
            - '**.md'

jobs:
  skip:
    runs-on: ubuntu-latest
    steps:
      - run: 'echo "No test required" '