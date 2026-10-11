// Deploys the site GitHub Actions built and tested for this commit (.github/workflows/frontend-build.yml).
// The VPS builds nothing: it downloads the built files, puts them live and updates the Nginx site.
// Setup and first-time steps: docs/deployment.md
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 40, unit: 'MINUTES')   // mostly waiting for GitHub Actions (usually 5–10 min)
    }

    environment {
        BUILDS_URL = 'https://github.com/Flexinit/ramellian-executive-travels-front-end/releases/download/frontend-builds'
        SITE_DIR   = '/var/www/ramellian'
        DOMAIN     = 'ramellianexecutivetravels.co.ke'
    }

    stages {
        stage('Wait for build') {
            when { branch 'master' }
            steps {
                // The same push started GitHub Actions, which tests and builds first. Its file appears only if the
                // tests passed, so a failed run never gets deployed.
                sh '''
                    URL="$BUILDS_URL/site-$GIT_COMMIT.tar.gz"
                    for i in $(seq 1 90); do
                      if curl -fsSL -o site.tar.gz "$URL"; then echo "Downloaded $URL"; exit 0; fi
                      sleep 20
                    done
                    echo "No build for $GIT_COMMIT after 30 min. Check its GitHub Actions run: the tests may have failed." >&2
                    exit 1
                '''
            }
        }

        stage('Deploy') {
            when { branch 'master' }
            steps {
                sh 'sh deploy/release.sh site.tar.gz "$GIT_COMMIT"'
            }
        }

        stage('Host Nginx') {
            when { branch 'master' }
            steps {
                // Installs the site from deploy/nginx/: https once a certificate exists, http until then.
                sh 'sh deploy/nginx/install-host-site.sh'
            }
        }

        stage('Smoke test') {
            when { branch 'master' }
            steps {
                // Through Nginx by name, as a visitor would arrive (a redirect to https also counts as up).
                sh '''
                    curl -fsS -o /dev/null -H "Host: $DOMAIN" http://127.0.0.1/ \
                      || { echo "Nginx didn't serve the site for $DOMAIN" >&2; exit 1; }
                '''
            }
        }
    }

    post {
        success {
            // The container from the earlier Docker setup, if it's still there: no longer used.
            sh '''
                if command -v docker > /dev/null 2>&1; then
                  docker rm -f ramellian-frontend 2>/dev/null || true
                  docker images -q ramellian-frontend ghcr.io/flexinit/ramellian-executive-travels-front-end \
                    | sort -u | xargs -r docker rmi -f 2>/dev/null || true
                fi
            '''
        }
        always {
            sh 'rm -f site.tar.gz'
        }
    }
}
