// Deploys the frontend image GitHub Actions built and tested for this commit (.github/workflows/frontend-image.yml).
// The VPS builds nothing: it waits for the image, pulls it, updates the Nginx site and swaps the container.
// Setup and first-time steps: docs/deployment.md
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 40, unit: 'MINUTES')   // mostly waiting for GitHub Actions (usually 5–10 min)
    }

    environment {
        REGISTRY_IMAGE = 'ghcr.io/flexinit/ramellian-executive-travels-front-end'
        CONTAINER      = 'ramellian-frontend'
        HOST_PORT      = '8085'   // host Nginx proxies to this; keep in sync with deploy/nginx/ramellian-locations.conf
    }

    stages {
        stage('Wait for image') {
            when { branch 'master' }
            steps {
                // The same push started GitHub Actions, which tests and builds first. Its image appears as
                // sha-<commit> only if the tests passed, so a failed run never gets deployed.
                sh '''
                    TAG="$REGISTRY_IMAGE:sha-$GIT_COMMIT"
                    for i in $(seq 1 90); do
                      if out=$(docker pull -q "$TAG" 2>&1); then echo "Pulled $TAG"; exit 0; fi
                      case "$out" in
                        *denied*|*unauthorized*)
                          echo "$out" >&2
                          echo "The registry refused the pull. Make the package public (docs/deployment.md, Step 3)." >&2
                          exit 1 ;;
                      esac
                      sleep 20
                    done
                    echo "$out" >&2
                    echo "No image for $GIT_COMMIT after 30 min. Check its GitHub Actions run: the tests may have failed." >&2
                    exit 1
                '''
            }
        }

        stage('Host Nginx') {
            when { branch 'master' }
            steps {
                // Installs the site from deploy/nginx/: https once a certificate exists, http until then.
                sh 'sh deploy/nginx/install-host-site.sh'
            }
        }

        stage('Deploy') {
            when { branch 'master' }
            steps {
                sh '''
                    docker rm -f $CONTAINER 2>/dev/null || true
                    docker run -d --name $CONTAINER \
                      --restart unless-stopped \
                      -p 127.0.0.1:$HOST_PORT:80 \
                      $REGISTRY_IMAGE:sha-$GIT_COMMIT
                '''
            }
        }

        stage('Smoke test') {
            when { branch 'master' }
            steps {
                sh '''
                    for i in 1 2 3 4 5 6 7 8 9 10; do
                      curl -fsS http://127.0.0.1:$HOST_PORT/ >/dev/null && exit 0
                      sleep 2
                    done
                    echo "Frontend container did not answer on port $HOST_PORT" && exit 1
                '''
            }
        }
    }

    post {
        success {
            // Images left by the earlier build-on-the-VPS pipeline: unused once the new container runs.
            sh 'docker images ramellian-frontend -q | sort -u | xargs -r docker rmi -f || true'
        }
        always {
            // Keep the 5 newest pulled images for rollback (any older one can be pulled again from the registry).
            sh '''
                docker images $REGISTRY_IMAGE --format '{{.Tag}}' | grep '^sha-' | tail -n +6 \
                  | xargs -r -I{} docker rmi $REGISTRY_IMAGE:{} || true
                docker image prune -f || true
            '''
        }
    }
}
