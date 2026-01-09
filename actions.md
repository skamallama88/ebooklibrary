name: Docker Build and Push
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Lowercase Registry and Repository
        id: prep
        run: |
          # Strip 'https://' if present and lowercase everything
          REGISTRY_DOMAIN=$(echo "${{ gitea.server_url }}" | sed -e 's|^https://||' -e 's|^http://||' | tr '[:upper:]' '[:lower:]')
          REPO_LOWER=$(echo "${{ gitea.repository }}" | tr '[:upper:]' '[:lower:]')
          echo "registry=${REGISTRY_DOMAIN}" >> $GITHUB_OUTPUT
          echo "repo=${REPO_LOWER}" >> $GITHUB_OUTPUT

      - name: Login to Gitea Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ steps.prep.outputs.registry }}
          username: ${{ gitea.actor }}
          password: ${{ secrets.REGISTRY_TOKEN }}


      - name: Login to Gitea Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ gitea.server_url }}
          username: ${{ gitea.actor }}
          password: ${{ secrets.REGISTRY_TOKEN }}

      - name: Build and Push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          # Note: Gitea requires lowercase image names
          tags: |
            ${{ gitea.server_url }}/${{ gitea.repository }}:latest
            ${{ gitea.server_url }}/${{ gitea.repository }}:${{ gitea.sha }}
        env:
          # Fix for older act_runner versions if token parsing fails
          ACTIONS_RUNTIME_TOKEN: ""
