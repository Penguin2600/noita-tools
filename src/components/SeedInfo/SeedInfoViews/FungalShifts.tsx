import { FC, useContext } from "react";
import { Stack, Form, Tooltip, OverlayTrigger, Table } from "react-bootstrap";

import { GameInfoProvider } from "../../../services/SeedInfo/infoHandler";
import { FungalInfoProvider } from "../../../services/SeedInfo/infoHandler/InfoProviders/Fungal";
import { MaterialInfoProvider } from "../../../services/SeedInfo/infoHandler/InfoProviders/Material";
import { AlchemyConfigContext } from "../../AlchemyConfigContext";
import { capitalize } from "../../../services/helpers";
import { useTranslation } from "react-i18next";
import { useMaterialFavorite } from "./helpers";
import { GameInfoContext } from "../SeedDataOutput";
import classNames from "classnames";
import i18n from "../../../i18n";

const materialProvider = new MaterialInfoProvider(i18n);

enum Direction {
  From,
  To,
}

const HeldMaterial = ({ warning }: { warning: boolean }) => {
  return <b className={classNames(warning ? "text-warning" : "text-info")}>Held Material</b>;
};

interface IFungalMaterialProps {
  id: string | string[];
  size?: string;
  showColor?: boolean;
  className?: string;
}

export const FungalMaterial: React.FC<IFungalMaterialProps> = ({ id, showColor = true, className, size }) => {
  const ids = [id].flat();
  const [showId] = useContext(AlchemyConfigContext);
  const { isFavorite } = useMaterialFavorite();
  const name = materialProvider.translate(ids[0]);

  const calculatedSize = size ? `calc(1rem * ${size})` : "1rem";

  return (
    <div
      className={classNames(ids.some(isFavorite) && "text-info", className)}
      style={{
        fontSize: calculatedSize,
      }}
    >
      {showColor && (
        <div
          className={"d-inline-block align-sub rounded-3 me-1 border border-light"}
          style={{
            marginBottom: "-2px",
            width: calculatedSize,
            height: calculatedSize,
            backgroundColor: "#" + materialProvider.provide(ids[0]).color,
          }}
        >
          {" "}
        </div>
      )}{" "}
      {capitalize(name)} {showId && <span className="text-muted fw-light">{`(${ids.join(", ")})`}</span>}
    </div>
  );
};

interface IFungalMaterialListProps {
  materials: Map<string, string>;
  direction?: Direction;
  heldMaterial?: boolean;
  isFavorite: (id: string) => boolean;
  getColor: (id: string) => string;
  showId: boolean;
  gold_to_x?: string;
}

export const FungalMaterialList: React.FC<IFungalMaterialListProps> = ({
  materials,
  direction,
  gold_to_x,
  heldMaterial,
  isFavorite,
  getColor,
  showId,
}) => {
  /*
	Var 'materials' may contain multiple materials with the same display name.
	This is because some materials like 'Flammable Gas' have static variants that are
	pre-rendered in a scene. Static materials have their own material ID.

	These materials should not be displayed twice.

	To solve this, materials will be sorted in a new `Map` where the key is the material
	name acts as the key and the material ids are stored in the value as an array.
	*/

  const materialsByName = new Map();
  materials.forEach((name, id) => {
    const ids = materialsByName.get(name) ?? [];
    ids.push(id);
    materialsByName.set(name, ids);
  });

  // The logic that returns a JSX component requires an `Array`
  const materialsByNameArray = Array.from(materialsByName);

  return (
    <Stack>
      {heldMaterial && direction === Direction.To && gold_to_x && (
        <div
          className="d-flex flex-nowrap text-nowrap text-muted"
          style={{
            marginBottom: "-8px",
          }}
        >
          <FungalMaterial size="0.75" id="gold" />{" "}
          <span
            style={{
              fontSize: "0.75rem",
            }}
            className="mx-2"
          >
            &rarr;
          </span>{" "}
          <FungalMaterial size="0.75" id={gold_to_x} />
        </div>
      )}
      {heldMaterial && <HeldMaterial warning={gold_to_x !== "gold" && direction === Direction.To} />}
      {materialsByNameArray.map(([name, ids]) => (
        <FungalMaterial key={name} id={ids} />
      ))}
    </Stack>
  );
};

interface IShiftProps {
  data: ReturnType<FungalInfoProvider["provide"]>[number];
  shifted: boolean;
  setShifted: (shifted: boolean) => void;
  materialProvider: MaterialInfoProvider;
}

export const Shift: FC<IShiftProps> = props => {
  const { data, shifted, setShifted, materialProvider } = props;
  const [showId] = useContext(AlchemyConfigContext);
  const { isFavorite } = useMaterialFavorite();

  // TODO: More uniform if data.from and data.to is always an array?
  const from: Array<string> = [data.from].flat();
  const to: Array<string> = [data.to].flat();
  // TODO: Maybe have translate return already capitalized?
  const fromMaterials = new Map(
    from.map(id => {
      return [id, materialProvider.translate(id)];
    }),
  );
  const toMaterials = new Map(
    to.map(id => {
      return [id, materialProvider.translate(id)];
    }),
  );

  const gold_to_x = data.gold_to_x;

  return (
    <tr className="align-middle">
      <td>
        <FungalMaterialList
          materials={fromMaterials}
          direction={Direction.From}
          heldMaterial={data.flaskFrom}
          isFavorite={isFavorite}
          getColor={(id: string) => materialProvider.provide(id).color}
          showId={showId}
        />
      </td>
      <td>&rarr;</td>
      <td>
        <FungalMaterialList
          materials={toMaterials}
          direction={Direction.To}
          heldMaterial={data.flaskTo}
          isFavorite={isFavorite}
          getColor={(id: string) => materialProvider.provide(id).color}
          showId={showId}
          gold_to_x={gold_to_x}
        />
      </td>
      <td>
        <OverlayTrigger placement="right" key="right" overlay={<Tooltip id={`tooltip-right`}>Shifted</Tooltip>}>
          <Form.Check
            checked={shifted}
            onChange={e => {
              setShifted(e.target.checked);
            }}
            type="checkbox"
            id={`shifted`}
            // label={`shifted`}
            enterKeyHint="done"
          />
        </OverlayTrigger>
      </td>
    </tr>
  );
};

interface IFungalShiftsProps {
  fungalData: ReturnType<FungalInfoProvider["provide"]>;
  infoProvider: GameInfoProvider;
}

const FungalShifts = (props: IFungalShiftsProps) => {
  const { fungalData, infoProvider } = props;
  const [t] = useTranslation("materials");

  const handleSetShifted = (i: number) => (shifted: boolean) => {
    const currentShifted = [...infoProvider.config.fungalShifts];
    currentShifted[i] = shifted;
    infoProvider.updateConfig({
      fungalShifts: currentShifted,
    });
  };

  return (
    <Table striped hover borderless size="sm">
      <tbody>
        {fungalData.map((data, i) => {
          return (
            <Shift
              key={i + t("$current_language")}
              data={data}
              shifted={!!infoProvider.config.fungalShifts[i]}
              setShifted={handleSetShifted(i)}
              materialProvider={infoProvider.providers.material}
            />
          );
        })}
      </tbody>
    </Table>
  );
};

export default FungalShifts;
