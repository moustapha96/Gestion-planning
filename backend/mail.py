import smtplib

# Configuration SMTP
smtp_server = "smtp.gouv.sn"
smtp_port = 25
smtp_user = "gp-adm@adm.gouv.sn"
smtp_password = "Gp@dm2026"

try:
    # Connexion au serveur SMTP
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()  # Active STARTTLS
        server.ehlo()      # Salutation EHLO

        # Authentification
        server.login(smtp_user, smtp_password)
        print("✅ Authentification réussie ! Les identifiants sont corrects.")
except smtplib.SMTPAuthenticationError:
    print("❌ Erreur : Authentification échouée. Vérifiez vos identifiants.")
except smtplib.SMTPException as e:
    print(f"❌ Erreur SMTP : {e}")
except Exception as e:
    print(f"❌ Erreur générale : {e}")