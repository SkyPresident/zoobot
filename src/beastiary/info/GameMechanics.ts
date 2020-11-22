import { oneLine } from "common-tags";
import AnimalInfoCommand from "../../commands/AnimalInfoCommand";
import ChangeAnimalNicknameCommand from "../../commands/ChangeAnimalNicknameCommand";
import CrewCommand from "../../commands/Crew/CrewCommand";
import EncounterCommand from "../../commands/EncounterCommand";
import GiveXpCommand from "../../commands/GiveXpCommand";
import SetEncounterChannelCommand from "../../commands/SetEncounterChannelCommand";
import ViewCollectionCommand from "../../commands/ViewCollectionCommand";
import ViewTokensCommand from "../../commands/ViewTokensCommand";

interface GameMechanicInfo {
    names: string[],
    info: string
}

const mechanics: GameMechanicInfo[] = [
    {
        names: ["general", "how to play"],
        info: oneLine`
            The Beastiary is a bot that's all about collecting animals, customizing them, leveling them up, and eventually getting their
            tokens! Start playing by using the \`${EncounterCommand.primaryName}\` command to generate an animal encounter, and reacting
            to the encounter of an animal you want to capture. Once you've captured an animal, you can view their information with the
            \`${ViewCollectionCommand.primaryName}\` command, and customize them with the \`${ChangeAnimalNicknameCommand.primaryName}\`
            command (more customizations to come). Animals are worth money, too; you'll need that money to upgrade your collection's
            maximum capacity, so you can expand your menagerie even further!
        `
    },
    {
        names: ["encounters", "encounter"],
        info: oneLine`
            Encounters are the primary way to obtain new animals. When you see an encounter, you have 60 seconds to react to it before the
            animal will flee. Make sure you react quickly, someone else could get it first! You get 5 free encounters every 2 hours, and
            can buy more using the shop command (for some currency, of course). Additionally, encounters occur randomly when there's
            message activity in the server. You can change the channel these encounters occur in using the
            \`${SetEncounterChannelCommand.primaryName}\` command.
        `
    },
    {
        names: ["captures", "capture"],
        info: oneLine`
            Capturing is how you claim an animal seen in an encounter for yourself. Once you've captured an animal, you can view its info
            with the \`${AnimalInfoCommand.primaryName}\` command. Captured animal species aren't exclusive to the user that has them, so
            be sure to make up for that by having the highest level of every species in your server! You get one free capture every 4
            hours, so be sure to use it wisely. Additional captures can be bought in the shop.
        `
    },
    {
        names: ["animals", "animal"],
        info: oneLine`
            So you've caught an animal; what now? Well, you should give it a name! Nickname animals with the
            \`${ChangeAnimalNicknameCommand.primaryName}\` command and give them a funky sense of style. All animals start at level 1,
            and that's not very interesting. Learn more about gaining experience for your animals in the \`experience\` section.
        `
    },
    {
        names: ["experience", "xp", "leveling"],
        info: oneLine`
            Experience is the main way to distinguish how much cooler your animals are compared to everybody else's. Starting at level 1,
            you can start gaining experience for your animals by adding them to your crew, which gives them some experience every time you
            send a message in the server! It's a small amount, so staying active in your favorite servers with The Beastiary is the way to
            go. You also get some free xp boosts every 3 hours, which you can give to any of your animals with
            \`${GiveXpCommand.primaryName}\`.
        `
    },
    {
        names: ["crew"],
        info: oneLine`
            Your crew is the spot where only your coolest animals hang out (or the ones whose tokens you want). You can only have 2 animals
            in your crew at once, so choose wisely. Each animal in your crew gets a small amount of experience for every single message you
            send in their home server, so stay active! Manage your crew with the \`${CrewCommand.primaryName}\` command.
        `
    },
    {
        names: ["tokens", "token"],
        info: oneLine`
            Tokens are your reward for dedication to an animal. Every time one of your animals gains experience, it has a chance to drop
            its token, and that chance increases with the amount of experience the animal gains. Tokens are rare collectibles that every
            species has, think of them as a gift from that species for being so good to it. You can view your collected tokens with the
            \`${ViewTokensCommand.primaryName}\` command.
        `
    }
];

export default mechanics;