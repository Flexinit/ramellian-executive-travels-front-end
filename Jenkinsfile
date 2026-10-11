// Builds the frontend as a Docker image on the VPS and swaps the running container.
// Setup and first-time steps: docs/deployment.md
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        IMAGE          = 'ramellian-frontend'
        CONTAINER      = 'ramellian-frontend'
        HOST_PORT      = '8085'   // host Nginx proxies to this; keep in sync with deploy/nginx/ramellian-locations.conf

        // Baked into the bundle at build time. The API address is picked in 'Build image': the backend directly while
        // the site is on http, the site itself (host Nginx forwards /api) once it has HTTPS, since browsers block an
        // https page from calling an http API.
        SITE_URL                          = 'https://ramellianexecutivetravels.co.ke'
        DIRECT_API_URL                    = 'http://102.68.87.231:8090'
        VITE_PESAPAL_ENV                  = 'live'
        VITE_ENABLE_WHATSAPP_VERIFICATION = 'false'
        VITE_GOOGLE_CLIENT_ID             = credentials('ramellian-google-client-id')
    }

    stages {
        stage('Test') {
            steps {
                sh 'docker build --target test -t $IMAGE:test-$BUILD_NUMBER .'
            }
        }

        stage('Host Nginx') {
            when { branch 'master' }
            steps {
                // Installs the site from deploy/nginx/ and reports whether it is on https (writes .site-scheme).
                sh 'sh deploy/nginx/install-host-site.sh'
            }
        }

        stage('Build image') {
            steps {
                script {
                    def https = fileExists('.site-scheme') && readFile('.site-scheme').trim() == 'https'
                    env.API_BASE_URL = https ? env.SITE_URL : env.DIRECT_API_URL
                    echo "Building with API_BASE_URL=${env.API_BASE_URL}"
                }
                sh '''
                    docker build \
                      --build-arg VITE_API_BASE_URL="$API_BASE_URL" \
                      --build-arg VITE_SWAGGER_URL="$API_BASE_URL/swagger-ui/index.html" \
                      --build-arg VITE_PESAPAL_ENV="$VITE_PESAPAL_ENV" \
                      --build-arg VITE_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" \
                      --build-arg VITE_ENABLE_WHATSAPP_VERIFICATION="$VITE_ENABLE_WHATSAPP_VERIFICATION" \
                      -t $IMAGE:$BUILD_NUMBER -t $IMAGE:latest .
                '''
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
                      $IMAGE:$BUILD_NUMBER
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
        always {
            sh 'docker rmi $IMAGE:test-$BUILD_NUMBER 2>/dev/null || true'
            // Keep the 5 newest numbered images for rollback; drop the rest and dangling layers.
            sh '''
                docker images $IMAGE --format '{{.Tag}}' | grep -E '^[0-9]+$' | sort -rn | tail -n +6 \
                  | xargs -r -I{} docker rmi $IMAGE:{} || true
                docker image prune -f || true
            '''
        }
    }
}
