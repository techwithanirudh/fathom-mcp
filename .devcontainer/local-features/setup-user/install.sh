#!/usr/bin/env bash
set -eux

USERNAME=${USERNAME:-"dev"}

if [ "$(id -u)" -ne 0 ]; then
    echo 'Script must be run as root.'
    exit 1
fi

if ! id "$USERNAME" >/dev/null 2>&1; then
    echo "User '$USERNAME' does not exist. Create it (e.g. via common-utils) before running this script."
    exit 1
fi

USER_HOME=$(getent passwd "$USERNAME" | cut -d: -f6)

rm -f /etc/profile.d/00-restore-env.sh
echo "export PATH=${PATH//$(sh -lc 'echo $PATH')/\$PATH}" > /etc/profile.d/00-restore-env.sh
chmod +x /etc/profile.d/00-restore-env.sh

NODE_ROOT="${USER_HOME}/nvm"
mkdir -p "$NODE_ROOT"
ln -snf /usr/local/share/nvm "$NODE_ROOT"
NODE_PATH="${NODE_ROOT}/current"
chown -R "${USERNAME}:${USERNAME}" "$NODE_ROOT" || true

if getent group docker >/dev/null 2>&1; then
    usermod -aG docker "$USERNAME"
else
    groupadd -r docker
    usermod -aG docker "$USERNAME"
fi

cat <<EOF >> "/etc/sudoers.d/${USERNAME}"
Defaults secure_path="${NODE_PATH}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/${USERNAME}/.local/bin"
EOF

chown "${USERNAME}:${USERNAME}" "${USER_HOME}/.bashrc"
echo "Done!"
